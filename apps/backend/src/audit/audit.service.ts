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

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  async log(params: AuditLogParams): Promise<AuditEvent> {
    const event = this.auditRepo.create({
      entityType:   params.entityType,
      entityId:     params.entityId,
      eventType:    params.eventType,
      fromStatus:   params.fromStatus ?? null,
      toStatus:     params.toStatus   ?? null,
      actorRole:    params.actorRole  ?? null,
      actorId:      params.actorId,
      actorAddress: params.actorAddress ?? null,
      metadata:     params.metadata   ?? null,
      ipAddress:    params.ipAddress  ?? null,
    });
    return this.auditRepo.save(event);
  }

  async getByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    return this.auditRepo.find({
      where: { entityType, entityId },
      order: { createdAt: 'ASC' },
    });
  }

  async getByEventType(eventType: string): Promise<AuditEvent[]> {
    return this.auditRepo.find({
      where: { eventType },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async searchEvents(filters: {
    entityType?: string;
    eventType?: string;
    actorId?: string;
    limit?: number;
  }): Promise<AuditEvent[]> {
    const where: Record<string, string> = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.actorId) where.actorId = filters.actorId;

    return this.auditRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(filters.limit ?? 100, 1), 500),
    });
  }
}
