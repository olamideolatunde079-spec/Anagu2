import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('legal_reviews')
export class LegalReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'parcel_id', type: 'uuid' })
  parcelId: string;

  @Column({ name: 'legal_officer_id', type: 'uuid', nullable: true })
  legalOfficerId: string | null;

  @Column({ name: 'clearance_status', type: 'text', default: 'PENDING' })
  clearanceStatus: 'PENDING' | 'CLEARED' | 'QUERIED' | 'REJECTED';

  @Column({ name: 'encumbrance_check_passed', default: false })
  encumbranceCheckPassed: boolean;

  @Column({ name: 'statutory_compliance_passed', default: false })
  statutoryCompliancePassed: boolean;

  @Column({ name: 'lua_1978_compliant', default: false })
  lua1978Compliant: boolean;

  @Column({ name: 'clearance_hash', type: 'varchar', length: 64, nullable: true })
  clearanceHash: string | null;

  @Column({ type: 'text', nullable: true })
  findings: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
