import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';

export interface AuditLogParams {
  entityType:   string;
  entityId:     string;
  eventType:    string;
  fromStatus?:  string | null;
  toStatus?:    string | null;
  actorRole?:   string;
  actorId:      string;
  actorAddress?: string;
  metadata?:    Record<string, unknown>;
  ipAddress?:   string;
}

/**
 * Immutable audit trail — every state transition in the registration
 * workflow is recorded here. No UPDATE or DELETE is permitted on audit_events
 * (enforced at the DB level by SQL rules in 02_schema.sql).
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  async log(params: AuditLogParams): Promise<AuditEvent> {
    const event = this.auditRepo.create({
      entityType:  params.entityType,
      entityId:    params.entityId,
      eventType:   params.eventType,
      fromStatus:  params.fromStatus ?? null,
      toStatus:    params.toStatus   ?? null,
      actorRole:   params.actorRole  ?? null,
      actorId:     params.actorId,
      actorAddress: params.actorAddress ?? null,
      metadata:    params.metadata   ?? null,
    });
    return this.auditRepo.save(event);
  }

  async getByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    return this.auditRepo.find({
      where:  { entityType, entityId },
      order:  { createdAt: 'ASC' },
    });
  }

  async getByEventType(eventType: string): Promise<AuditEvent[]> {
    return this.auditRepo.find({
      where: { eventType },
      order: { createdAt: 'DESC' },
      take:  200,
    });
  }
}
