import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('application_status_history')
export class ApplicationStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'from_status', type: 'text', nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'text' })
  toStatus: string;

  @Column({ type: 'text' })
  stage: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_role', type: 'text', nullable: true })
  actorRole: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'transitioned_at' })
  transitionedAt: Date;
}
