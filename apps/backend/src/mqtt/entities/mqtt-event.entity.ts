import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('mqtt_events')
export class MqttEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  topic: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'smallint', default: 1 })
  qos: number;

  @Column({ name: 'payload_bytes', type: 'integer', nullable: true })
  payloadBytes: number | null;

  @Column({ default: false })
  delivered: boolean;

  @CreateDateColumn({ name: 'published_at' })
  publishedAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;
}
