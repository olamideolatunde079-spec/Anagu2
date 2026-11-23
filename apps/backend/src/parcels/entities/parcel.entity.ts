import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('parcels')
export class Parcel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Geometry stored as WKT; actual GEOMETRY type managed by PostGIS/raw SQL
  @Column({ type: 'text', select: false })
  geom: string;

  @Column({ name: 'spatial_hash', type: 'bytea' })
  spatialHash: Buffer;

  @Column({ name: 'area_sqm', type: 'double precision', nullable: true })
  areaSqm: number | null;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ name: 'overlap_tolerance_m', type: 'double precision', default: 0.5 })
  overlapToleranceM: number;

  @Column({ type: 'text', nullable: true })
  lga: string | null;

  @Column({ type: 'text', nullable: true })
  state: string | null;

  @Column({ name: 'address_desc', type: 'text', nullable: true })
  addressDesc: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
