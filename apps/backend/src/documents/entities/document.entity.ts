import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type DocumentCategory =
  | 'IDENTITY'
  | 'SURVEY'
  | 'OWNERSHIP_PROOF'
  | 'LEGAL'
  | 'CERTIFICATE'
  | 'CORRESPONDENCE';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({ name: 'parcel_id', type: 'uuid', nullable: true })
  parcelId: string | null;

  @Column({ name: 'document_type' })
  documentType: string;

  @Column({ name: 'document_category', type: 'text', default: 'OWNERSHIP_PROOF' })
  documentCategory: DocumentCategory;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'bucket_name', type: 'text', default: 'land-documents' })
  bucketName: string;

  @Column({ name: 'minio_key', unique: true })
  minioKey: string;

  @Column({ name: 'mime_type', type: 'text', default: 'application/pdf' })
  mimeType: string;

  @Column({ name: 'file_hash' })
  fileHash: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: string | null;

  @Column({ type: 'text', default: 'PRIVATE' })
  visibility: string;

  @Column({ name: 'is_private', default: true })
  isPrivate: boolean;

  @Column({ name: 'encryption_alg', type: 'text', default: 'AES256' })
  encryptionAlg: string;

  @Column({ name: 'checksum_verified', default: false })
  checksumVerified: boolean;

  @Column({ name: 'review_status', type: 'text', default: 'PENDING' })
  reviewStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'retention_until', type: 'timestamptz', nullable: true })
  retentionUntil: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
