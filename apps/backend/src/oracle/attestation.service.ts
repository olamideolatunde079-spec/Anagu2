import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Attestation } from './entities/attestation.entity';
import { Application } from '../parcels/entities/application.entity';
import { AuditService } from '../audit/audit.service';
import { MqttService } from '../mqtt/mqtt.service';
import { UserRole } from '../auth/entities/user.entity';
import { CreateAttestationDto } from './dto/attestation.dto';
import { VerificationOutcome } from './ownership-verification.service';

@Injectable()
export class AttestationService {
  constructor(
    @InjectRepository(Attestation)
    private readonly attestationRepo: Repository<Attestation>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    private readonly dataSource: DataSource,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly mqttService?: MqttService,
  ) {}

  async createAttestation(dto: CreateAttestationDto, actorId: string, actorRole: UserRole) {
    const application = await this.appRepo.findOne({ where: { id: dto.applicationId } });
    if (!application) throw new NotFoundException(`Application ${dto.applicationId} not found`);

    const signatureHash = crypto
      .createHash('sha256')
      .update(`${dto.applicationId}|${dto.attesterName}|${dto.decision}|${Date.now()}`)
      .digest('hex');

    const record = this.attestationRepo.create({
      applicationId: application.id,
      parcelId: application.parcelId,
      attestationType: dto.attestationType,
      attesterUserId: actorId,
      attesterName: dto.attesterName,
      attesterRoleOrTitle: dto.attesterRoleOrTitle ?? null,
      institutionId: dto.institutionId ?? null,
      statement: dto.statement ?? null,
      decision: dto.decision,
      confidenceWeight: dto.confidenceWeight ?? 25,
      signatureHash,
    });

    const saved = await this.attestationRepo.save(record);

    await this.auditService?.log({
      entityType: 'attestation',
      entityId: saved.id,
      eventType: `ATTESTATION_${dto.decision}`,
      actorRole,
      actorId,
      metadata: {
        applicationId: application.id,
        attestationType: dto.attestationType,
        attesterName: dto.attesterName,
      },
    });

    return saved;
  }

  async listByApplication(applicationId: string, userId: string, role: UserRole) {
    const application = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException(`Application ${applicationId} not found`);

    const oversight = [
      UserRole.SURVEYOR,
      UserRole.REGISTRAR,
      UserRole.LAND_ADMINISTRATOR,
      UserRole.GOVERNOR,
    ].includes(role);
    if (!oversight && application.applicantId !== userId) {
      throw new ForbiddenException('You do not have access to this application.');
    }

    return this.attestationRepo.find({
      where: { applicationId },
      order: { attestedAt: 'DESC' },
    });
  }

  async syncApplicationOwnershipStatus(
    applicationId: string,
    outcome: VerificationOutcome,
    actorId: string,
    actorRole: UserRole,
  ) {
    const application = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!application) return null;

    if (outcome === VerificationOutcome.VERIFIED && application.status === 'SPATIAL_VERIFIED') {
      const prevStatus = application.status;
      application.status = 'OWNERSHIP_VERIFIED';
      application.ownershipVerifiedAt = new Date();
      await this.appRepo.save(application);

      await this.dataSource.query(
        `INSERT INTO application_status_history (
           application_id, from_status, to_status, stage, actor_id, actor_role, notes
         ) VALUES ($1::uuid, $2::application_status, 'OWNERSHIP_VERIFIED', 'OWNERSHIP_ORACLE', $3::uuid, $4::user_role, $5)`,
        [
          application.id,
          prevStatus,
          actorId,
          actorRole,
          'Ownership verification oracle confirmed institutional and community attestations.',
        ],
      );

      await this.auditService?.log({
        entityType: 'application',
        entityId: application.id,
        eventType: 'OWNERSHIP_VERIFIED',
        fromStatus: prevStatus,
        toStatus: 'OWNERSHIP_VERIFIED',
        actorRole,
        actorId,
      });

      try {
        await this.mqttService?.publishOwnershipVerified(application.id, application.applicantId);
      } catch {
        // Non-fatal
      }
    }

    return application;
  }
}
