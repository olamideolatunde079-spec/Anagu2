import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('audit_events')
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ name: 'from_status', type: 'text', nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'text', nullable: true })
  toStatus: string | null;

  @Column({
    name: 'actor_role',
    type: 'enum',
    enum: ['CITIZEN', 'SURVEYOR', 'REGISTRAR', 'LAND_ADMINISTRATOR', 'GOVERNOR'],
    enumName: 'user_role',
    nullable: true,
  })
  actorRole: string | null;

  @Column({ name: 'actor_id' })
  actorId: string;

  @Column({ name: 'actor_address', type: 'varchar', length: 42, nullable: true })
  actorAddress: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
