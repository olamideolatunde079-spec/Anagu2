import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('states')
export class State {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16, unique: true })
  code: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ name: 'geopolitical_zone', type: 'text', nullable: true })
  geopoliticalZone: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('lgas')
export class Lga {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'state_id', type: 'uuid' })
  stateId: string;

  @Column({ type: 'varchar', length: 24, unique: true })
  code: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  headquarters: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('jurisdictions')
export class Jurisdiction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  code: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'jurisdiction_type', type: 'text' })
  jurisdictionType:
    | 'STATE_MINISTRY'
    | 'ZONAL_LAND_REGISTRY'
    | 'LGA_CADASTRAL_OFFICE'
    | 'SURVEYOR_GENERAL_OFFICE';

  @Column({ name: 'state_id', type: 'uuid', nullable: true })
  stateId: string | null;

  @Column({ name: 'lga_id', type: 'uuid', nullable: true })
  lgaId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
