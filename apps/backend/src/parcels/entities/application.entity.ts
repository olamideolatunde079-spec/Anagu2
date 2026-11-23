import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parcel_id' })
  parcelId: string;

  @Column({ name: 'applicant_id' })
  applicantId: string;

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

  @Column({ default: 'SUBMITTED' })
  status: string;

  @Column({ name: 'rejection_stage', type: 'text', nullable: true })
  rejectionStage: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'registrar_id', type: 'uuid', nullable: true })
  registrarId: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
