import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('parcel_photos')
export class ParcelPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parcel_id', type: 'uuid' })
  parcelId: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  @Column({ name: 'object_key', type: 'text', unique: true })
  objectKey: string;

  @Column({ name: 'original_file_name', type: 'text' })
  originalFileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 50 })
  mimeType: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: string;

  @Column({ type: 'varchar', length: 64 })
  sha256: string;

  @Column({ type: 'text', default: 'PENDING' })
  status: string;

  @Column({ name: 'is_cover', type: 'boolean', default: false })
  isCover: boolean;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
