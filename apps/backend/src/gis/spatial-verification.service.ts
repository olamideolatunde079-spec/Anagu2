import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { keccak256, toUtf8Bytes } from 'ethers';

export type Coordinate = [number, number]; // [longitude, latitude] in WGS 84

export type SpatialRejectionReason =
  | 'INVALID_GEOMETRY'
  | 'OVERLAPPING_PARCEL'
  | 'INSUFFICIENT_COORDINATES';

export interface SpatialValidationResult {
  valid:                boolean;
  reason?:              SpatialRejectionReason;
  overlappingParcelId?: string;
  diagnosticMessage?:   string;
  spatialHash?:         string;
  wkt?:                 string;
}

@Injectable()
export class SpatialVerificationService {
  private readonly logger = new Logger(SpatialVerificationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async verifyParcel(
    coordinates: Coordinate[],
    excludeParcelId?: string,
    overlapToleranceMetres?: number,
  ): Promise<SpatialValidationResult> {
    if (coordinates.length < 3) {
      return {
        valid: false,
        reason: 'INSUFFICIENT_COORDINATES',
        diagnosticMessage: 'A polygon requires at least 3 coordinate pairs.',
      };
    }

    const wkt = this.coordinatesToWKT(coordinates);
    const tolerance = overlapToleranceMetres
      ?? this.config.get<number>('GIS_OVERLAP_TOLERANCE_METRES', 0.5);

    const geometryRows = await this.dataSource.query<
      Array<{ is_valid: boolean; reason: string }>
    >(
      `SELECT
         ST_IsValid(ST_GeomFromText($1, 4326))       AS is_valid,
         ST_IsValidReason(ST_GeomFromText($1, 4326)) AS reason`,
      [wkt],
    );

    if (!geometryRows[0].is_valid) {
      this.logger.warn(`Invalid geometry submitted: ${geometryRows[0].reason}`);
      return {
        valid: false,
        reason: 'INVALID_GEOMETRY',
        diagnosticMessage: geometryRows[0].reason,
        wkt,
      };
    }

    const overlapRows = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT id
       FROM   parcels
       WHERE  ST_Intersects(
                ST_Buffer(ST_GeomFromText($1, 4326)::geography, $2)::geometry,
                geom
              )
       AND    ($3::uuid IS NULL OR id != $3::uuid)
       AND    status != 'REVOKED'
       LIMIT  1`,
      [wkt, tolerance, excludeParcelId ?? null],
    );

    if (overlapRows.length > 0) {
      const overlappingId = overlapRows[0].id;
      this.logger.warn(`Parcel overlaps existing parcel ${overlappingId}`);
      return {
        valid: false,
        reason: 'OVERLAPPING_PARCEL',
        overlappingParcelId: overlappingId,
        diagnosticMessage:
          `Submitted parcel overlaps existing registered parcel (id: ${overlappingId}). ` +
          `Overlap tolerance used: ${tolerance} m.`,
        wkt,
      };
    }

    const spatialHash = keccak256(toUtf8Bytes(wkt));
    this.logger.log(`Parcel passed spatial verification. spatialHash=${spatialHash}`);

    return { valid: true, spatialHash, wkt };
  }

  /**
   * Verify parcel geometry/overlap AND persist an audit record in gis_verifications.
   */
  async verifyAndRecordParcel(params: {
    parcelId: string;
    applicationId?: string | null;
    surveyorUserId?: string | null;
    surveyPlanNumber?: string | null;
    coordinates: Coordinate[];
    excludeParcelId?: string;
    overlapToleranceMetres?: number;
  }) {
    const result = await this.verifyParcel(
      params.coordinates,
      params.excludeParcelId ?? params.parcelId,
      params.overlapToleranceMetres,
    );
    const tolerance = params.overlapToleranceMetres
      ?? this.config.get<number>('GIS_OVERLAP_TOLERANCE_METRES', 0.5);
    const wkt = result.wkt ?? this.coordinatesToWKT(params.coordinates);
    const spatialHash = result.spatialHash ?? keccak256(toUtf8Bytes(wkt));

    let computedAreaSqm: number | null = null;
    if (result.valid) {
      const areaRows = await this.dataSource.query<Array<{ area_sqm: number }>>(
        `SELECT ST_Area(ST_GeomFromText($1, 4326)::geography) AS area_sqm`,
        [wkt],
      );
      computedAreaSqm = areaRows[0]?.area_sqm ? Number(areaRows[0].area_sqm) : null;
    }

    const overlappingIds = result.overlappingParcelId ? [result.overlappingParcelId] : null;
    const inserted = await this.dataSource.query<Array<{ id: string }>>(
      `INSERT INTO gis_verifications (
         application_id, parcel_id, surveyor_user_id, survey_plan_number, srid,
         st_is_valid, is_valid_reason, overlap_detected, overlapping_parcel_ids,
         overlap_area_sqm, overlap_tolerance_m, computed_area_sqm,
         spatial_hash, diagnostic_message, raw_wkt
       )
       VALUES ($1, $2, $3, $4, 4326, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        params.applicationId ?? null,
        params.parcelId,
        params.surveyorUserId ?? null,
        params.surveyPlanNumber ?? null,
        result.reason !== 'INVALID_GEOMETRY' && result.reason !== 'INSUFFICIENT_COORDINATES',
        result.reason === 'INVALID_GEOMETRY' ? result.diagnosticMessage ?? 'Invalid geometry' : 'Valid Geometry',
        result.reason === 'OVERLAPPING_PARCEL',
        overlappingIds,
        tolerance,
        computedAreaSqm,
        spatialHash,
        result.diagnosticMessage ?? null,
        wkt,
      ],
    );

    return {
      verificationId: inserted[0]?.id,
      ...result,
      spatialHash,
      computedAreaSqm,
    };
  }

  /**
   * Run PostGIS overlap check against an already persisted parcel ID.
   */
  async checkOverlapByParcelId(parcelId: string, toleranceMetres = 0.5) {
    const parcelRows = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM parcels WHERE id = $1::uuid`,
      [parcelId],
    );
    if (!parcelRows.length) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const overlaps = await this.dataSource.query<
      Array<{
        overlapping_parcel_id: string;
        parcel_number: string | null;
        status: string;
        overlap_area_sqm: number;
        distance_m: number;
      }>
    >(
      `SELECT * FROM fn_check_parcel_overlap(
         (SELECT geom FROM parcels WHERE id = $1::uuid),
         $1::uuid,
         $2
       )`,
      [parcelId, toleranceMetres],
    );

    return {
      parcelId,
      toleranceMetres,
      overlapDetected: overlaps.length > 0,
      overlaps: overlaps.map((o) => ({
        overlappingParcelId: o.overlapping_parcel_id,
        parcelNumber: o.parcel_number,
        status: o.status,
        overlapAreaSqm: Number(o.overlap_area_sqm ?? 0),
        distanceM: Number(o.distance_m ?? 0),
      })),
    };
  }

  /**
   * Spatial search across parcels using PostGIS ST_DWithin / bounding / metadata filters.
   */
  async searchParcels(filters: {
    lng?: number;
    lat?: number;
    radiusMetres?: number;
    state?: string;
    lga?: string;
    status?: string;
    limit?: number;
  }) {
    const conditions: string[] = ['p.geom IS NOT NULL'];
    const params: unknown[] = [];

    if (filters.state) {
      params.push(filters.state);
      conditions.push(`LOWER(p.state) = LOWER($${params.length})`);
    }
    if (filters.lga) {
      params.push(filters.lga);
      conditions.push(`LOWER(p.lga) = LOWER($${params.length})`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`p.status = $${params.length}::parcel_status`);
    }
    if (
      typeof filters.lng === 'number' &&
      !Number.isNaN(filters.lng) &&
      typeof filters.lat === 'number' &&
      !Number.isNaN(filters.lat)
    ) {
      const radius = Math.min(Math.max(filters.radiusMetres ?? 5000, 10), 100000);
      params.push(filters.lng, filters.lat, radius);
      const lngIdx = params.length - 2;
      const latIdx = params.length - 1;
      const radIdx = params.length;
      conditions.push(
        `ST_DWithin(p.geom::geography, ST_SetSRID(ST_MakePoint($${lngIdx}, $${latIdx}), 4326)::geography, $${radIdx})`,
      );
    }

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    params.push(limit);

    const rows = await this.dataSource.query(
      `SELECT p.id,
              p.parcel_number AS "parcelNumber",
              p.status,
              p.area_sqm AS "areaSqm",
              p.perimeter_m AS "perimeterM",
              p.state,
              p.lga,
              p.address_desc AS "addressDesc",
              p.title_type AS "titleType",
              p.land_use AS "landUse",
              ST_Y(p.centroid) AS latitude,
              ST_X(p.centroid) AS longitude,
              ST_AsGeoJSON(p.geom)::jsonb AS geojson
       FROM parcels p
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.created_at DESC
       LIMIT $${params.length}`,
      params,
    );

    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      areaSqm: row.areaSqm !== null ? Number(row.areaSqm) : null,
      perimeterM: row.perimeterM !== null ? Number(row.perimeterM) : null,
      latitude: row.latitude !== null ? Number(row.latitude) : null,
      longitude: row.longitude !== null ? Number(row.longitude) : null,
    }));
  }

  async getVerificationsByApplication(applicationId: string) {
    return this.dataSource.query(
      `SELECT id,
              application_id AS "applicationId",
              parcel_id AS "parcelId",
              surveyor_user_id AS "surveyorUserId",
              survey_plan_number AS "surveyPlanNumber",
              srid,
              st_is_valid AS "stIsValid",
              is_valid_reason AS "isValidReason",
              overlap_detected AS "overlapDetected",
              overlapping_parcel_ids AS "overlappingParcelIds",
              overlap_area_sqm AS "overlapAreaSqm",
              overlap_tolerance_m AS "overlapToleranceM",
              computed_area_sqm AS "computedAreaSqm",
              spatial_hash AS "spatialHash",
              diagnostic_message AS "diagnosticMessage",
              verified_at AS "verifiedAt"
       FROM gis_verifications
       WHERE application_id = $1::uuid
       ORDER BY verified_at DESC`,
      [applicationId],
    );
  }

  coordinatesToWKT(coordinates: Coordinate[]): string {
    const pts = [...coordinates];
    if (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1]) {
      pts.push(pts[0]);
    }
    const points = pts.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
    return `POLYGON((${points}))`;
  }
}
