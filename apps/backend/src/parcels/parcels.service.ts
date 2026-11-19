import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Application } from './entities/application.entity';
import { Parcel } from './entities/parcel.entity';
import { ApplicationStatusHistory } from './entities/application-status-history.entity';
import { LegalReview } from './entities/legal-review.entity';
import { SpatialVerificationService } from '../gis/spatial-verification.service';
import { AuditService } from '../audit/audit.service';
import { MqttService } from '../mqtt/mqtt.service';
import { UserRole } from '../auth/entities/user.entity';
import {
  LegalReviewDto,
  ResubmitApplicationDto,
  SubmitApplicationDto,
  SurveyReviewDto,
} from './dto/applications.dto';

@Injectable()
export class ParcelsService {
  private readonly logger = new Logger(ParcelsService.name);

  constructor(
    @InjectRepository(Application) private readonly appRepo: Repository<Application>,
    @InjectRepository(Parcel) private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepo: Repository<ApplicationStatusHistory>,
    @InjectRepository(LegalReview)
    private readonly legalReviewRepo: Repository<LegalReview>,
    private readonly gisService: SpatialVerificationService,
    private readonly auditService: AuditService,
    private readonly mqttService: MqttService,
    private readonly dataSource: DataSource,
  ) {}

  async findAllApplications(userId: string, role: string): Promise<Application[]> {
    const oversightRoles = [UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR];
    if (oversightRoles.includes(role as UserRole)) {
      return this.appRepo.find({ order: { createdAt: 'DESC' }, take: 200 });
    }
    if (role === UserRole.SURVEYOR) {
      return this.appRepo.find({
        where: [{ applicantId: userId }, { assignedSurveyorId: userId }],
        order: { createdAt: 'DESC' },
        take: 200,
      });
    }
    return this.appRepo.find({
      where: { applicantId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async submitApplication(
    dto: SubmitApplicationDto & { applicantId: string },
    actorRole: UserRole = UserRole.CITIZEN,
  ): Promise<{ applicationId: string; applicationRef: string; parcelId: string; parcelNumber: string; spatialResult: unknown }> {
    const spatialResult = await this.gisService.verifyParcel(dto.coordinates);

    if (!spatialResult.valid) {
      throw new BadRequestException({
        message: 'Spatial verification failed',
        reason: spatialResult.reason,
        detail: spatialResult.diagnosticMessage,
      });
    }

    const parcelNumber = `AN-PCL-${Date.now().toString(36).toUpperCase()}`;
    const applicationRef = `AN-APP-${Date.now().toString(36).toUpperCase()}`;

    const parcelResult = await this.dataSource.query(
      `INSERT INTO parcels (
         parcel_number, geom, spatial_hash, status, title_type, land_use,
         state_id, lga_id, jurisdiction_id, lga, state, address_desc
       )
       VALUES (
         $1, ST_GeomFromText($2, 4326), decode($3, 'hex'), 'PENDING',
         $4, $5, $6::uuid, $7::uuid, $8::uuid, $9, $10, $11
       )
       RETURNING id`,
      [
        parcelNumber,
        spatialResult.wkt!,
        spatialResult.spatialHash!.replace('0x', ''),
        dto.titleType ?? null,
        dto.landUse ?? null,
        dto.stateId ?? null,
        dto.lgaId ?? null,
        dto.jurisdictionId ?? null,
        dto.lga ?? null,
        dto.state ?? null,
        dto.addressDesc ?? null,
      ],
    );
    const parcelId = parcelResult[0].id as string;

    const now = new Date();
    const application = this.appRepo.create({
      applicationRef,
      parcelId,
      applicantId: dto.applicantId,
      applicationType: dto.applicationType ?? 'FIRST_REGISTRATION',
      ownerName: dto.ownerName,
      nationalId: dto.nationalId,
      surveyPlanNumber: dto.surveyPlanNumber ?? null,
      communityWitnesses: dto.communityWitnesses ?? null,
      legalClearanceHash: dto.legalClearanceHash ?? null,
      stateId: dto.stateId ?? null,
      lgaId: dto.lgaId ?? null,
      jurisdictionId: dto.jurisdictionId ?? null,
      status: 'SPATIAL_VERIFIED',
      spatialVerifiedAt: now,
    });
    await this.appRepo.save(application);

    await this.recordHistory(
      application.id,
      'SUBMITTED',
      'SPATIAL_VERIFIED',
      'SPATIAL_VERIFICATION',
      dto.applicantId,
      actorRole,
      'Application submitted and passed initial PostGIS spatial validation.',
    );

    await this.auditService.log({
      entityType: 'application',
      entityId: application.id,
      eventType: 'SPATIAL_VERIFIED',
      fromStatus: 'SUBMITTED',
      toStatus: 'SPATIAL_VERIFIED',
      actorRole,
      actorId: dto.applicantId,
      metadata: { applicationRef, parcelId, parcelNumber },
    });

    await this.createNotification(
      dto.applicantId,
      'REGISTRATION',
      'Application Submitted & Spatially Verified',
      `Application ${applicationRef} passed initial cadastral geometry validation.`,
      'application',
      application.id,
    );

    await this.safeMqtt(() =>
      this.mqttService.publishSpatialVerified(application.id, parcelId),
    );

    return {
      applicationId: application.id,
      applicationRef,
      parcelId,
      parcelNumber,
      spatialResult,
    };
  }

  async findApplicationById(id: string): Promise<Application> {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);
    return app;
  }

  async findApplicationByIdAuthorized(
    id: string,
    userId: string,
    role: string,
  ): Promise<Application> {
    const app = await this.findApplicationById(id);
    this.assertApplicationReadAccess(app, userId, role);
    return app;
  }

  async getApplicationHistory(id: string, userId: string, role: string) {
    const app = await this.findApplicationByIdAuthorized(id, userId, role);
    const [history, legalReviews, gisVerifications] = await Promise.all([
      this.historyRepo.find({
        where: { applicationId: app.id },
        order: { transitionedAt: 'ASC' },
      }),
      this.legalReviewRepo.find({
        where: { applicationId: app.id },
        order: { createdAt: 'DESC' },
      }),
      this.gisService.getVerificationsByApplication(app.id),
    ]);

    return {
      application: app,
      history,
      legalReviews,
      gisVerifications,
    };
  }

  async performSurveyReview(
    applicationId: string,
    dto: SurveyReviewDto,
    surveyorId: string,
  ): Promise<Application> {
    const app = await this.findApplicationById(applicationId);
    if (['APPROVED', 'NFT_ISSUED', 'COMPLETED', 'CANCELLED'].includes(app.status)) {
      throw new BadRequestException(`Cannot run survey review in status ${app.status}`);
    }

    const previousStatus = app.status;
    app.assignedSurveyorId = surveyorId;

    if (dto.surveyPlanNumber) {
      app.surveyPlanNumber = dto.surveyPlanNumber;
    }
    if (dto.surveyAccuracyClass) {
      await this.parcelRepo.update(app.parcelId, {
        surveyAccuracyClass: dto.surveyAccuracyClass,
      });
    }

    if (dto.coordinates?.length) {
      const gisRecord = await this.gisService.verifyAndRecordParcel({
        parcelId: app.parcelId,
        applicationId: app.id,
        surveyorUserId: surveyorId,
        surveyPlanNumber: dto.surveyPlanNumber ?? app.surveyPlanNumber,
        coordinates: dto.coordinates,
        excludeParcelId: app.parcelId,
      });

      if (!gisRecord.valid) {
        throw new BadRequestException({
          message: 'Survey coordinate verification failed',
          reason: gisRecord.reason,
          detail: gisRecord.diagnosticMessage,
        });
      }

      if (gisRecord.wkt && gisRecord.spatialHash) {
        await this.dataSource.query(
          `UPDATE parcels
           SET geom = ST_GeomFromText($1, 4326),
               spatial_hash = decode($2, 'hex')
           WHERE id = $3::uuid`,
          [gisRecord.wkt, gisRecord.spatialHash.replace('0x', ''), app.parcelId],
        );
      }
    }

    if (dto.passed) {
      app.status = 'SPATIAL_VERIFIED';
      app.spatialVerifiedAt = new Date();
      await this.appRepo.save(app);

      await this.recordHistory(
        app.id,
        previousStatus,
        'SPATIAL_VERIFIED',
        'SURVEY_REVIEW',
        surveyorId,
        UserRole.SURVEYOR,
        dto.notes ?? 'Licensed surveyor confirmed cadastral beacons and plan.',
      );

      await this.auditService.log({
        entityType: 'application',
        entityId: app.id,
        eventType: 'SURVEY_CLEARED',
        fromStatus: previousStatus,
        toStatus: 'SPATIAL_VERIFIED',
        actorRole: UserRole.SURVEYOR,
        actorId: surveyorId,
        metadata: { surveyPlanNumber: app.surveyPlanNumber, notes: dto.notes ?? null },
      });

      await this.safeMqtt(() =>
        this.mqttService.publish('land/survey/verified', {
          applicationId: app.id,
          parcelId: app.parcelId,
          surveyorId,
        }, 1),
      );
    } else {
      app.status = 'REJECTED';
      app.rejectionStage = 'SURVEY_REVIEW';
      app.rejectionReason = dto.notes ?? 'Survey verification failed cadastral inspection.';
      await this.appRepo.save(app);

      await this.recordHistory(
        app.id,
        previousStatus,
        'REJECTED',
        'SURVEY_REVIEW',
        surveyorId,
        UserRole.SURVEYOR,
        app.rejectionReason,
      );

      await this.auditService.log({
        entityType: 'application',
        entityId: app.id,
        eventType: 'REJECTED',
        fromStatus: previousStatus,
        toStatus: 'REJECTED',
        actorRole: UserRole.SURVEYOR,
        actorId: surveyorId,
        metadata: { stage: 'SURVEY_REVIEW', reason: app.rejectionReason },
      });

      await this.safeMqtt(() =>
        this.mqttService.publishRejected(app.id, 'SURVEY_REVIEW', app.rejectionReason!),
      );
    }

    return app;
  }

  async performLegalReview(
    applicationId: string,
    dto: LegalReviewDto,
    registrarId: string,
  ): Promise<{ application: Application; legalReview: LegalReview }> {
    const app = await this.findApplicationById(applicationId);
    if (!['OWNERSHIP_VERIFIED', 'SPATIAL_VERIFIED'].includes(app.status)) {
      throw new BadRequestException(`Application must be SPATIAL_VERIFIED or OWNERSHIP_VERIFIED before legal review (current: ${app.status})`);
    }

    const previousStatus = app.status;
    const clearanceHash =
      dto.clearanceHash ??
      crypto
        .createHash('sha256')
        .update(`${app.id}|${dto.clearanceStatus}|${registrarId}|${Date.now()}`)
        .digest('hex');

    const review = this.legalReviewRepo.create({
      applicationId: app.id,
      parcelId: app.parcelId,
      legalOfficerId: registrarId,
      clearanceStatus: dto.clearanceStatus,
      encumbranceCheckPassed: dto.encumbranceCheckPassed,
      statutoryCompliancePassed: dto.statutoryCompliancePassed,
      lua1978Compliant: dto.lua1978Compliant,
      clearanceHash,
      findings: dto.findings ?? null,
      reviewedAt: new Date(),
    });
    const savedReview = await this.legalReviewRepo.save(review);

    app.legalOfficerId = registrarId;

    if (
      dto.clearanceStatus === 'CLEARED' &&
      dto.encumbranceCheckPassed &&
      dto.statutoryCompliancePassed &&
      dto.lua1978Compliant
    ) {
      app.status = 'LEGAL_VERIFIED';
      app.legalVerifiedAt = new Date();
      app.legalClearanceHash = clearanceHash;
      await this.appRepo.save(app);

      await this.recordHistory(
        app.id,
        previousStatus,
        'LEGAL_VERIFIED',
        'LEGAL_REVIEW',
        registrarId,
        UserRole.REGISTRAR,
        dto.findings ?? 'Encumbrance and Land Use Act 1978 statutory checks passed.',
      );

      await this.auditService.log({
        entityType: 'application',
        entityId: app.id,
        eventType: 'LEGAL_VERIFIED',
        fromStatus: previousStatus,
        toStatus: 'LEGAL_VERIFIED',
        actorRole: UserRole.REGISTRAR,
        actorId: registrarId,
        metadata: { clearanceHash },
      });

      await this.createNotification(
        app.applicantId,
        'LEGAL_REVIEW',
        'Legal Review Cleared',
        `Application ${app.applicationRef ?? app.id} cleared statutory and encumbrance review.`,
        'application',
        app.id,
      );

      await this.safeMqtt(() =>
        this.mqttService.publish('land/review/legal-cleared', {
          applicationId: app.id,
          registrarId,
          clearanceHash,
        }, 1),
      );
    } else if (dto.clearanceStatus === 'REJECTED') {
      app.status = 'REJECTED';
      app.rejectionStage = 'LEGAL_REVIEW';
      app.rejectionReason = dto.findings ?? 'Failed statutory legal compliance review.';
      await this.appRepo.save(app);

      await this.recordHistory(
        app.id,
        previousStatus,
        'REJECTED',
        'LEGAL_REVIEW',
        registrarId,
        UserRole.REGISTRAR,
        app.rejectionReason,
      );

      await this.auditService.log({
        entityType: 'application',
        entityId: app.id,
        eventType: 'REJECTED',
        fromStatus: previousStatus,
        toStatus: 'REJECTED',
        actorRole: UserRole.REGISTRAR,
        actorId: registrarId,
        metadata: { stage: 'LEGAL_REVIEW', reason: app.rejectionReason },
      });
    } else {
      await this.appRepo.save(app);
      await this.recordHistory(
        app.id,
        previousStatus,
        app.status,
        'LEGAL_QUERY',
        registrarId,
        UserRole.REGISTRAR,
        dto.findings ?? 'Legal review queried additional documentation.',
      );
    }

    return { application: app, legalReview: savedReview };
  }

  /**
   * Statutory approval — REGISTRAR ONLY (platform administrators cannot grant statutory approvals).
   */
  async approveApplication(applicationId: string, registrarId: string): Promise<Application> {
    const app = await this.findApplicationById(applicationId);
    if (app.status !== 'LEGAL_VERIFIED') {
      throw new BadRequestException(`Cannot approve application in status: ${app.status}`);
    }
    const previousStatus = app.status;
    app.status = 'APPROVED';
    app.registrarId = registrarId;
    app.approvedAt = new Date();
    await this.appRepo.save(app);

    await this.recordHistory(
      app.id,
      previousStatus,
      'APPROVED',
      'STATUTORY_APPROVAL',
      registrarId,
      UserRole.REGISTRAR,
      'Approved by Registrar for NFT Certificate of Occupancy issuance.',
    );

    await this.auditService.log({
      entityType: 'application',
      entityId: app.id,
      eventType: 'APPROVED',
      fromStatus: previousStatus,
      toStatus: 'APPROVED',
      actorRole: UserRole.REGISTRAR,
      actorId: registrarId,
    });

    await this.createNotification(
      app.applicantId,
      'APPROVAL',
      'Application Approved by Registrar',
      `Application ${app.applicationRef ?? app.id} has been approved for blockchain title issuance.`,
      'application',
      app.id,
    );

    await this.safeMqtt(() => this.mqttService.publishApproved(app.id, registrarId));
    return app;
  }

  async rejectApplication(
    applicationId: string,
    stage: string,
    reason: string,
    actorId: string,
    actorRole: UserRole = UserRole.REGISTRAR,
  ): Promise<Application> {
    const app = await this.findApplicationById(applicationId);
    if (['NFT_ISSUED', 'COMPLETED', 'CANCELLED'].includes(app.status)) {
      throw new BadRequestException(`Cannot reject application in status: ${app.status}`);
    }

    const prevStatus = app.status;
    app.status = 'REJECTED';
    app.rejectionStage = stage;
    app.rejectionReason = reason;
    await this.appRepo.save(app);

    await this.recordHistory(app.id, prevStatus, 'REJECTED', stage, actorId, actorRole, reason);

    await this.auditService.log({
      entityType: 'application',
      entityId: app.id,
      eventType: 'REJECTED',
      fromStatus: prevStatus,
      toStatus: 'REJECTED',
      actorRole,
      actorId,
      metadata: { stage, reason },
    });

    await this.createNotification(
      app.applicantId,
      'REJECTION',
      'Application Requires Attention / Rejected',
      `Application ${app.applicationRef ?? app.id} was rejected at ${stage}: ${reason}`,
      'application',
      app.id,
    );

    await this.safeMqtt(() => this.mqttService.publishRejected(app.id, stage, reason));
    return app;
  }

  async resubmitApplication(
    applicationId: string,
    dto: ResubmitApplicationDto,
    applicantId: string,
  ): Promise<Application> {
    const app = await this.findApplicationById(applicationId);
    if (app.applicantId !== applicantId) {
      throw new ForbiddenException('Only the applicant may resubmit this application.');
    }
    if (app.status !== 'REJECTED') {
      throw new BadRequestException('Only rejected applications can be resubmitted.');
    }

    if (dto.coordinates?.length) {
      const gisResult = await this.gisService.verifyParcel(dto.coordinates, app.parcelId);
      if (!gisResult.valid) {
        throw new BadRequestException({
          message: 'Spatial re-verification failed',
          reason: gisResult.reason,
          detail: gisResult.diagnosticMessage,
        });
      }
      await this.dataSource.query(
        `UPDATE parcels
         SET geom = ST_GeomFromText($1, 4326),
             spatial_hash = decode($2, 'hex')
         WHERE id = $3::uuid`,
        [gisResult.wkt!, gisResult.spatialHash!.replace('0x', ''), app.parcelId],
      );
    }

    const previousStatus = app.status;
    if (dto.ownerName) app.ownerName = dto.ownerName;
    if (dto.surveyPlanNumber) app.surveyPlanNumber = dto.surveyPlanNumber;
    if (dto.communityWitnesses) app.communityWitnesses = dto.communityWitnesses;
    app.rejectionStage = null;
    app.rejectionReason = null;
    app.status = 'SPATIAL_VERIFIED';
    app.spatialVerifiedAt = new Date();
    await this.appRepo.save(app);

    await this.recordHistory(
      app.id,
      previousStatus,
      'SPATIAL_VERIFIED',
      'RESUBMISSION',
      applicantId,
      UserRole.CITIZEN,
      dto.notes ?? 'Applicant resubmitted updated registration package.',
    );

    await this.auditService.log({
      entityType: 'application',
      entityId: app.id,
      eventType: 'APPLICATION_RESUBMITTED',
      fromStatus: previousStatus,
      toStatus: 'SPATIAL_VERIFIED',
      actorRole: UserRole.CITIZEN,
      actorId: applicantId,
    });

    return app;
  }

  async cancelApplication(applicationId: string, applicantId: string): Promise<Application> {
    const app = await this.findApplicationById(applicationId);
    if (app.applicantId !== applicantId) {
      throw new ForbiddenException('Only the applicant may cancel this application.');
    }
    if (['APPROVED', 'BLOCKCHAIN_REGISTERED', 'NFT_ISSUED', 'COMPLETED', 'CANCELLED'].includes(app.status)) {
      throw new BadRequestException(`Cannot cancel application in status: ${app.status}`);
    }

    const prevStatus = app.status;
    app.status = 'CANCELLED';
    app.cancelledAt = new Date();
    await this.appRepo.save(app);

    await this.recordHistory(
      app.id,
      prevStatus,
      'CANCELLED',
      'APPLICANT_WITHDRAWAL',
      applicantId,
      UserRole.CITIZEN,
      'Withdrawn by applicant.',
    );

    await this.auditService.log({
      entityType: 'application',
      entityId: app.id,
      eventType: 'APPLICATION_CANCELLED',
      fromStatus: prevStatus,
      toStatus: 'CANCELLED',
      actorRole: UserRole.CITIZEN,
      actorId: applicantId,
    });

    return app;
  }

  async listParcels(userId: string, role: string, filters?: { status?: string; state?: string; lga?: string }) {
    const oversightRoles = [UserRole.SURVEYOR, UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR];
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (!oversightRoles.includes(role as UserRole)) {
      params.push(userId);
      conditions.push(
        `EXISTS (SELECT 1 FROM applications a WHERE a.parcel_id = p.id AND a.applicant_id = $${params.length}::uuid)`,
      );
    }
    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`p.status = $${params.length}::parcel_status`);
    }
    if (filters?.state) {
      params.push(filters.state);
      conditions.push(`LOWER(p.state) = LOWER($${params.length})`);
    }
    if (filters?.lga) {
      params.push(filters.lga);
      conditions.push(`LOWER(p.lga) = LOWER($${params.length})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await this.dataSource.query(
      `SELECT p.id,
              p.parcel_number AS "parcelNumber",
              p.status,
              p.area_sqm AS "areaSqm",
              p.perimeter_m AS "perimeterM",
              p.title_type AS "titleType",
              p.land_use AS "landUse",
              p.state,
              p.lga,
              p.address_desc AS "addressDesc",
              ST_Y(p.centroid) AS latitude,
              ST_X(p.centroid) AS longitude,
              ST_AsGeoJSON(p.geom)::jsonb AS geojson,
              p.created_at AS "createdAt"
       FROM parcels p
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT 200`,
      params,
    );
    return rows;
  }

  async getParcelDetails(parcelId: string, userId: string, role: string) {
    const rows = await this.dataSource.query(
      `SELECT p.id,
              p.parcel_number AS "parcelNumber",
              p.status,
              p.area_sqm AS "areaSqm",
              p.perimeter_m AS "perimeterM",
              p.overlap_tolerance_m AS "overlapToleranceM",
              p.survey_accuracy_class AS "surveyAccuracyClass",
              p.title_type AS "titleType",
              p.land_use AS "landUse",
              p.state,
              p.lga,
              p.address_desc AS "addressDesc",
              ST_Y(p.centroid) AS latitude,
              ST_X(p.centroid) AS longitude,
              ST_AsGeoJSON(p.geom)::jsonb AS geojson,
              p.created_at AS "createdAt"
       FROM parcels p
       WHERE p.id = $1::uuid`,
      [parcelId],
    );
    if (!rows.length) throw new NotFoundException(`Parcel ${parcelId} not found`);

    const oversightRoles = [UserRole.SURVEYOR, UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR];
    if (!oversightRoles.includes(role as UserRole)) {
      const owned = await this.dataSource.query(
        `SELECT 1 FROM applications WHERE parcel_id = $1::uuid AND applicant_id = $2::uuid LIMIT 1`,
        [parcelId, userId],
      );
      if (!owned.length) {
        throw new ForbiddenException('You do not have access to this parcel.');
      }
    }

    const [verifications, titles] = await Promise.all([
      this.dataSource.query(
        `SELECT id, st_is_valid AS "stIsValid", overlap_detected AS "overlapDetected",
                computed_area_sqm AS "computedAreaSqm", spatial_hash AS "spatialHash",
                verified_at AS "verifiedAt"
         FROM gis_verifications WHERE parcel_id = $1::uuid ORDER BY verified_at DESC`,
        [parcelId],
      ),
      this.dataSource.query(
        `SELECT id, title_number AS "titleNumber", token_id AS "tokenId",
                chain_id AS "chainId", owner_address AS "ownerAddress",
                tx_hash AS "txHash", is_revoked AS "isRevoked", issued_at AS "issuedAt"
         FROM land_titles WHERE parcel_id = $1::uuid ORDER BY issued_at DESC`,
        [parcelId],
      ),
    ]);

    return { ...rows[0], gisVerifications: verifications, titles };
  }

  async getParcelOwnershipHistory(parcelId: string) {
    const parcel = await this.parcelRepo.findOne({ where: { id: parcelId } });
    if (!parcel) throw new NotFoundException(`Parcel ${parcelId} not found`);

    return this.dataSource.query(
      `SELECT toh.id,
              lt.token_id AS "tokenId",
              lt.title_number AS "titleNumber",
              toh.owner_address AS "ownerAddress",
              toh.ownership_share_bps AS "ownershipShareBps",
              toh.acquisition_type AS "acquisitionType",
              toh.tx_hash AS "txHash",
              toh.is_current AS "isCurrent",
              toh.acquired_at AS "acquiredAt",
              toh.relinquished_at AS "relinquishedAt"
       FROM title_ownership_history toh
       JOIN land_titles lt ON lt.id = toh.land_title_id
       WHERE lt.parcel_id = $1::uuid
       ORDER BY toh.acquired_at DESC`,
      [parcelId],
    );
  }

  private assertApplicationReadAccess(app: Application, userId: string, role: string) {
    const oversightRoles = [UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR];
    if (oversightRoles.includes(role as UserRole)) return;
    if (role === UserRole.SURVEYOR && (app.applicantId === userId || app.assignedSurveyorId === userId)) {
      return;
    }
    if (app.applicantId !== userId) {
      throw new ForbiddenException('You do not have access to this application.');
    }
  }

  private async recordHistory(
    applicationId: string,
    fromStatus: string | null,
    toStatus: string,
    stage: string,
    actorId: string | null,
    actorRole: UserRole,
    notes: string | null,
  ) {
    await this.historyRepo.save(
      this.historyRepo.create({
        applicationId,
        fromStatus,
        toStatus,
        stage,
        actorId,
        actorRole,
        notes,
      }),
    );
  }

  private async createNotification(
    userId: string,
    category: string,
    title: string,
    body: string,
    entityType: string,
    entityId: string,
  ) {
    try {
      await this.dataSource.query(
        `INSERT INTO notifications (user_id, channel, category, title, body, entity_type, entity_id)
         VALUES ($1::uuid, 'IN_APP', $2, $3, $4, $5, $6::uuid)`,
        [userId, category, title, body, entityType, entityId],
      );
    } catch (err) {
      this.logger.warn(`Failed to create notification: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async safeMqtt(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(`Non-fatal MQTT publish failure: ${err instanceof Error ? err.message : err}`);
    }
  }
}
