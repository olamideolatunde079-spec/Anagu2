import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('gis_verifications')
export class GisVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId: string | null;

  @Column({ name: 'parcel_id', type: 'uuid' })
  parcelId: string;

  @Column({ name: 'surveyor_user_id', type: 'uuid', nullable: true })
  surveyorUserId: string | null;

  @Column({ name: 'survey_plan_number', type: 'text', nullable: true })
  surveyPlanNumber: string | null;

  @Column({ type: 'integer', default: 4326 })
  srid: number;

  @Column({ name: 'st_is_valid' })
  stIsValid: boolean;

  @Column({ name: 'is_valid_reason', type: 'text', nullable: true })
  isValidReason: string | null;

  @Column({ name: 'overlap_detected', default: false })
  overlapDetected: boolean;

  @Column({ name: 'overlapping_parcel_ids', type: 'uuid', array: true, nullable: true })
  overlappingParcelIds: string[] | null;

  @Column({ name: 'overlap_area_sqm', type: 'double precision', default: 0 })
  overlapAreaSqm: number;

  @Column({ name: 'overlap_tolerance_m', type: 'double precision', default: 0.5 })
  overlapToleranceM: number;

  @Column({ name: 'computed_area_sqm', type: 'double precision', nullable: true })
  computedAreaSqm: number | null;

  @Column({ name: 'spatial_hash', type: 'text' })
  spatialHash: string;

  @Column({ name: 'diagnostic_message', type: 'text', nullable: true })
  diagnosticMessage: string | null;

  @Column({ name: 'raw_wkt', type: 'text', nullable: true })
  rawWkt: string | null;

  @CreateDateColumn({ name: 'verified_at' })
  verifiedAt: Date;
}
