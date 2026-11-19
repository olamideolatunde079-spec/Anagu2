import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type AttestationType =
  | 'COMMUNITY_ELDER'
  | 'TRADITIONAL_RULER'
  | 'NEIGHBOR_WITNESS'
  | 'INSTITUTIONAL_REGISTRY'
  | 'LICENSED_SURVEYOR';

@Entity('attestations')
export class Attestation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'parcel_id', type: 'uuid' })
  parcelId: string;

  @Column({ name: 'oracle_verification_id', type: 'uuid', nullable: true })
  oracleVerificationId: string | null;

  @Column({ name: 'attestation_type', type: 'text' })
  attestationType: AttestationType;

  @Column({ name: 'attester_user_id', type: 'uuid', nullable: true })
  attesterUserId: string | null;

  @Column({ name: 'attester_name', type: 'text' })
  attesterName: string;

  @Column({ name: 'attester_national_id', type: 'text', nullable: true })
  attesterNationalId: string | null;

  @Column({ name: 'attester_role_or_title', type: 'text', nullable: true })
  attesterRoleOrTitle: string | null;

  @Column({ name: 'institution_id', type: 'uuid', nullable: true })
  institutionId: string | null;

  @Column({ type: 'text', nullable: true })
  statement: string | null;

  @Column({ type: 'text' })
  decision: 'ENDORSED' | 'CONFLICT' | 'ABSTAINED' | 'PENDING';

  @Column({ name: 'confidence_weight', type: 'integer', default: 1 })
  confidenceWeight: number;

  @Column({ name: 'signature_hash', type: 'text', nullable: true })
  signatureHash: string | null;

  @CreateDateColumn({ name: 'attested_at' })
  attestedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
