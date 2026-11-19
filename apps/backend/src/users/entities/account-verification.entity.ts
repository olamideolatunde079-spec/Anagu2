import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('account_verifications')
export class AccountVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'verification_type', type: 'text' })
  verificationType: 'EMAIL' | 'PHONE' | 'NIN_IDENTITY' | 'SURVEYOR_LICENSE' | 'INSTITUTIONAL_ID';

  @Column({ type: 'text', default: 'PENDING' })
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

  @Column({ name: 'reference_hash', type: 'varchar', length: 64, nullable: true })
  referenceHash: string | null;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
