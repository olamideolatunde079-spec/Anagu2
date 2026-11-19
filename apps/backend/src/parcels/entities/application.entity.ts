import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_ref', type: 'varchar', length: 64, unique: true, nullable: true })
  applicationRef: string | null;

  @Column({ name: 'parcel_id' })
  parcelId: string;

  @Column({ name: 'applicant_id' })
  applicantId: string;

  @Column({ name: 'application_type', type: 'text', default: 'FIRST_REGISTRATION' })
  applicationType: 'FIRST_REGISTRATION' | 'RECTIFICATION' | 'SUBDIVISION' | 'CONSOLIDATION' | 'REISSUE';

  @Column({ name: 'owner_name' })
  ownerName: string;

  @Column({ name: 'national_id' })
  nationalId: string;

  @Column({ name: 'survey_plan_number', type: 'text', nullable: true })
  surveyPlanNumber: string | null;

  @Column({ name: 'community_witnesses', type: 'jsonb', nullable: true })
  communityWitnesses: string[] | null;

  @Column({ name: 'legal_clearance_hash', type: 'text', nullable: true })
  legalClearanceHash: string | null;

  @Column({ name: 'state_id', type: 'uuid', nullable: true })
  stateId: string | null;

  @Column({ name: 'lga_id', type: 'uuid', nullable: true })
  lgaId: string | null;

  @Column({ name: 'jurisdiction_id', type: 'uuid', nullable: true })
  jurisdictionId: string | null;

  @Column({ name: 'assigned_surveyor_id', type: 'uuid', nullable: true })
  assignedSurveyorId: string | null;

  @Column({ name: 'legal_officer_id', type: 'uuid', nullable: true })
  legalOfficerId: string | null;

  @Column({ name: 'registrar_id', type: 'uuid', nullable: true })
  registrarId: string | null;

  @Column({ default: 'SUBMITTED' })
  status: string;

  @Column({ name: 'rejection_stage', type: 'text', nullable: true })
  rejectionStage: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ name: 'spatial_verified_at', type: 'timestamptz', nullable: true })
  spatialVerifiedAt: Date | null;

  @Column({ name: 'ownership_verified_at', type: 'timestamptz', nullable: true })
  ownershipVerifiedAt: Date | null;

  @Column({ name: 'legal_verified_at', type: 'timestamptz', nullable: true })
  legalVerifiedAt: Date | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
