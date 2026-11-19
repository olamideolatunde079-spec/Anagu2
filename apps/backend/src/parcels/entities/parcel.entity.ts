import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('parcels')
export class Parcel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parcel_number', type: 'varchar', length: 64, unique: true, nullable: true })
  parcelNumber: string | null;

  @Column({ type: 'text', select: false })
  geom: string;

  @Column({ name: 'spatial_hash', type: 'bytea' })
  spatialHash: Buffer;

  @Column({ name: 'area_sqm', type: 'double precision', nullable: true })
  areaSqm: number | null;

  @Column({ name: 'perimeter_m', type: 'double precision', nullable: true })
  perimeterM: number | null;

  @Column({ type: 'integer', default: 4326 })
  srid: number;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ name: 'overlap_tolerance_m', type: 'double precision', default: 0.5 })
  overlapToleranceM: number;

  @Column({ name: 'survey_accuracy_class', type: 'text', default: 'SUB_METRE' })
  surveyAccuracyClass: string;

  @Column({ name: 'title_type', type: 'text', nullable: true })
  titleType: string | null;

  @Column({ name: 'land_use', type: 'text', nullable: true })
  landUse: string | null;

  @Column({ name: 'state_id', type: 'uuid', nullable: true })
  stateId: string | null;

  @Column({ name: 'lga_id', type: 'uuid', nullable: true })
  lgaId: string | null;

  @Column({ name: 'jurisdiction_id', type: 'uuid', nullable: true })
  jurisdictionId: string | null;

  @Column({ type: 'text', nullable: true })
  lga: string | null;

  @Column({ type: 'text', nullable: true })
  state: string | null;

  @Column({ name: 'address_desc', type: 'text', nullable: true })
  addressDesc: string | null;

  @Column({ name: 'parent_parcel_id', type: 'uuid', nullable: true })
  parentParcelId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
