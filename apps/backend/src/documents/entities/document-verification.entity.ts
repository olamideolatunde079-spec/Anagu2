import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { UserRole } from '../../auth/entities/user.entity';

@Entity('document_verifications')
export class DocumentVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ type: 'text' })
  decision: 'VERIFIED' | 'REJECTED' | 'FLAGGED';

  @Column({ name: 'computed_sha256', type: 'varchar', length: 64 })
  computedSha256: string;

  @Column({ name: 'checksum_matched' })
  checksumMatched: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'verified_at' })
  verifiedAt: Date;
}

@Entity('document_access_grants')
export class DocumentAccessGrant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'grantee_user_id', type: 'uuid', nullable: true })
  granteeUserId: string | null;

  @Column({ name: 'grantee_role', type: 'enum', enum: UserRole, nullable: true })
  granteeRole: UserRole | null;

  @Column({ name: 'access_level', type: 'text', default: 'VIEW' })
  accessLevel: 'VIEW' | 'DOWNLOAD' | 'VERIFY';

  @Column({ name: 'granted_by', type: 'uuid', nullable: true })
  grantedBy: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
