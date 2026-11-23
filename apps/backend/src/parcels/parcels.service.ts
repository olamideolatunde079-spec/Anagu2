import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Application } from './entities/application.entity';
import { Parcel } from './entities/parcel.entity';
import { SpatialVerificationService } from '../gis/spatial-verification.service';
import { AuditService } from '../audit/audit.service';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class ParcelsService {
  private readonly logger = new Logger(ParcelsService.name);

  constructor(
    @InjectRepository(Application) private readonly appRepo: Repository<Application>,
    @InjectRepository(Parcel)      private readonly parcelRepo: Repository<Parcel>,
    private readonly gisService:   SpatialVerificationService,
    private readonly auditService: AuditService,
    private readonly mqttService:  MqttService,
    private readonly dataSource:   DataSource,
  ) {}

  // ── GET /applications — list for current user (or all for admin/registrar) ──
  async findAllApplications(userId: string, role: string): Promise<Application[]> {
    const adminRoles = ['REGISTRAR', 'LAND_ADMINISTRATOR', 'GOVERNOR'];
    if (adminRoles.includes(role)) {
      return this.appRepo.find({ order: { createdAt: 'DESC' }, take: 200 });
    }
    // Citizens and surveyors only see their own
    return this.appRepo.find({
      where:  { applicantId: userId },
      order:  { createdAt: 'DESC' },
    });
  }

  // ── POST /applications — submit and spatially verify ─────────────────────
  async submitApplication(params: {
    applicantId:         string;
    ownerName:           string;
    nationalId:          string;
    surveyPlanNumber?:   string;
    communityWitnesses?: string[];
    legalClearanceHash?: string;
    coordinates:         [number, number][];
    lga?:                string;
    state?:              string;
    addressDesc?:        string;
  }): Promise<{ applicationId: string; parcelId: string; spatialResult: unknown }> {
    // Stage 1: Spatial verification
    const spatialResult = await this.gisService.verifyParcel(params.coordinates);

    if (!spatialResult.valid) {
      throw new BadRequestException({
        message: 'Spatial verification failed',
        reason:  spatialResult.reason,
        detail:  spatialResult.diagnosticMessage,
      });
    }

    // Insert parcel with PostGIS geometry
    const parcelResult = await this.dataSource.query(
      `INSERT INTO parcels (geom, spatial_hash, status, lga, state, address_desc)
       VALUES (ST_GeomFromText($1, 4326), decode($2, 'hex'), 'PENDING', $3, $4, $5)
       RETURNING id`,
      [
        spatialResult.wkt!,
        spatialResult.spatialHash!.replace('0x', ''),
        params.lga         ?? null,
        params.state       ?? null,
        params.addressDesc ?? null,
      ],
    );
    const parcelId = parcelResult[0].id as string;

    const application = this.appRepo.create({
      parcelId,
      applicantId:        params.applicantId,
      ownerName:          params.ownerName,
      nationalId:         params.nationalId,
      surveyPlanNumber:   params.surveyPlanNumber   ?? null,
      communityWitnesses: params.communityWitnesses ?? null,
      legalClearanceHash: params.legalClearanceHash ?? null,
      status: 'SPATIAL_VERIFIED',
    });
    await this.appRepo.save(application);

    await this.auditService.log({
      entityType: 'application',
      entityId:   application.id,
      eventType:  'SPATIAL_VERIFIED',
      fromStatus: 'SUBMITTED',
      toStatus:   'SPATIAL_VERIFIED',
      actorRole:  'CITIZEN',
      actorId:    params.applicantId,
    });

    await this.mqttService.publishSpatialVerified(application.id, parcelId);

    return { applicationId: application.id, parcelId, spatialResult };
  }

  // ── GET /applications/:id ─────────────────────────────────────────────────
  async findApplicationById(id: string): Promise<Application> {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);
    return app;
  }

  // ── PATCH /applications/:id/approve ──────────────────────────────────────
  async approveApplication(applicationId: string, registrarId: string): Promise<Application> {
    const app = await this.findApplicationById(applicationId);
    if (app.status !== 'LEGAL_VERIFIED') {
      throw new BadRequestException(`Cannot approve application in status: ${app.status}`);
    }
    const previousStatus = app.status;
    app.status      = 'APPROVED';
    app.registrarId = registrarId;
    app.approvedAt  = new Date();
    await this.appRepo.save(app);

    await this.auditService.log({
      entityType: 'application', entityId: app.id,
      eventType: 'APPROVED', fromStatus: previousStatus, toStatus: 'APPROVED',
      actorRole: 'REGISTRAR', actorId: registrarId,
    });
    await this.mqttService.publishApproved(app.id, registrarId);
    return app;
  }

  // ── PATCH /applications/:id/reject ───────────────────────────────────────
  async rejectApplication(
    applicationId: string, stage: string, reason: string, actorId: string,
  ): Promise<Application> {
    const app = await this.findApplicationById(applicationId);
    const prevStatus    = app.status;
    app.status          = 'REJECTED';
    app.rejectionStage  = stage;
    app.rejectionReason = reason;
    await this.appRepo.save(app);

    await this.auditService.log({
      entityType: 'application', entityId: app.id,
      eventType: 'REJECTED', fromStatus: prevStatus, toStatus: 'REJECTED',
      actorRole: 'REGISTRAR', actorId: actorId, metadata: { stage, reason },
    });
    await this.mqttService.publishRejected(app.id, stage, reason);
    return app;
  }
}
