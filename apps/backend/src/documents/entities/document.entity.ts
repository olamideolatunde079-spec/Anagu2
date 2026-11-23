import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({ name: 'document_type' })
  documentType: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'minio_key', unique: true })
  minioKey: string;

  @Column({ name: 'file_hash' })
  fileHash: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
