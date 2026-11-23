import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('administrative_configs')
export class AdministrativeConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'config_key', type: 'text', unique: true })
  configKey: string;

  @Column({ name: 'config_value', type: 'jsonb' })
  configValue: Record<string, unknown>;

  @Column({ type: 'text' })
  category: 'GIS' | 'ORACLE' | 'BLOCKCHAIN' | 'STORAGE' | 'MARKETPLACE' | 'SECURITY' | 'SYSTEM';

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_sensitive', default: false })
  isSensitive: boolean;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
