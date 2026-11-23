import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { keccak256, toUtf8Bytes } from 'ethers';

// ── Types ───────────────────────────────────────────────────────────────────
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
  /** keccak256 of the WKT polygon — used as spatialHash on the NFT */
  spatialHash?:         string;
  wkt?:                 string;
}

// ── Service ──────────────────────────────────────────────────────────────────
/**
 * Component 1 — GIS-Based Spatial Verification (Objective i)
 *
 * Validates that a submitted land parcel has correct geometry and doesn't
 * overlap an already-registered parcel, before the application proceeds further.
 *
 * Procedure (from PROJECT.md):
 *  1. Receive parcel coordinates submitted by the applicant.
 *  2. Convert the coordinates into a GIS polygon.
 *  3. Validate the geometry (ST_IsValid).
 *  4. Compare against existing parcels (ST_Intersects).
 *  5. Detect boundary overlap or topological inconsistency.
 *  6. Approve or reject with specific diagnostic feedback.
 *
 * Implementation notes:
 *  - PostGIS ST_IsValid() for geometry validation.
 *  - PostGIS ST_Intersects() + ST_Buffer() for overlap detection.
 *  - WGS 84 / EPSG:4326.
 *  - Explicit overlap tolerance (default 0.5 m) — not exact-geometry intersection.
 */
@Injectable()
export class SpatialVerificationService {
  private readonly logger = new Logger(SpatialVerificationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  /**
   * Verify a submitted parcel.
   *
   * @param coordinates      Array of [lng, lat] pairs (min 3; polygon is auto-closed).
   * @param excludeParcelId  Optional UUID to exclude (e.g. when updating an existing parcel).
   * @param overlapToleranceMetres  Buffer in metres. Defaults to GIS_OVERLAP_TOLERANCE_METRES env var.
   */
  async verifyParcel(
    coordinates: Coordinate[],
    excludeParcelId?: string,
    overlapToleranceMetres?: number,
  ): Promise<SpatialValidationResult> {
    // ── Step 2: Convert coordinates → WKT polygon ─────────────────────
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

    // ── Step 3: Validate geometry (ST_IsValid) ────────────────────────
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

    // ── Steps 4–5: Overlap check (ST_Intersects + ST_Buffer) ─────────
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

    // ── Step 6: Compute spatialHash for NFT metadata ──────────────────
    const spatialHash = keccak256(toUtf8Bytes(wkt));

    this.logger.log(`Parcel passed spatial verification. spatialHash=${spatialHash}`);

    return { valid: true, spatialHash, wkt };
  }

  // ── Utility ────────────────────────────────────────────────────────────
  /**
   * Convert [lng, lat] coordinate array to a WKT POLYGON string.
   * Automatically closes the ring if the first and last points differ.
   */
  coordinatesToWKT(coordinates: Coordinate[]): string {
    const pts = [...coordinates];
    // Close the ring
    if (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1]) {
      pts.push(pts[0]);
    }
    const points = pts.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
    return `POLYGON((${points}))`;
  }
}
