import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import { Document } from './entities/document.entity';
import { Application } from '../parcels/entities/application.entity';
import { UserRole } from '../auth/entities/user.entity';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    private readonly config: ConfigService,
  ) {
    const minioPort = Number(this.config.get<string>('MINIO_PORT', '9000'));
    if (!Number.isInteger(minioPort) || minioPort < 1 || minioPort > 65535) {
      throw new Error('MINIO_PORT must be an integer between 1 and 65535.');
    }

    this.minioClient = new Minio.Client({
      endPoint:  this.config.get('MINIO_ENDPOINT', 'localhost'),
      port:      minioPort,
      useSSL:    this.config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get('MINIO_ROOT_USER', 'anagu_minio'),
      secretKey: this.config.get('MINIO_ROOT_PASSWORD', 'anagu_minio_secret'),
    });
    this.bucket = this.config.get('MINIO_BUCKET_DOCUMENTS', 'land-documents');
  }

  async uploadDocument(params: {
    applicationId: string;
    documentType:  string;
    fileName:      string;
    fileBuffer:    Buffer;
    mimeType:      string;
    uploadedBy:    string;
    role:          UserRole;
  }): Promise<Document> {
    await this.assertApplicationAccess(params.applicationId, params.uploadedBy, params.role);
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(params.mimeType)) {
      throw new BadRequestException('Only PDF, JPEG, and PNG documents are accepted.');
    }
    const fileHash  = crypto.createHash('sha256').update(params.fileBuffer).digest('hex');
    const minioKey  = `${params.applicationId}/${params.documentType}/${Date.now()}-${params.fileName}`;

    await this.minioClient.putObject(
      this.bucket,
      minioKey,
      params.fileBuffer,
      params.fileBuffer.length,
      { 'Content-Type': params.mimeType, 'x-amz-meta-hash': fileHash },
    );

    const doc = this.docRepo.create({
      applicationId: params.applicationId,
      documentType:  params.documentType,
      fileName:      params.fileName,
      minioKey,
      fileHash,
      fileSizeBytes: String(params.fileBuffer.length),
      uploadedBy:    params.uploadedBy,
    });

    await this.docRepo.save(doc);
    this.logger.log(`Document uploaded: ${minioKey}`);
    return doc;
  }

  async getPresignedUrl(minioKey: string, expirySeconds = 3600): Promise<string> {
    return this.minioClient.presignedGetObject(this.bucket, minioKey, expirySeconds);
  }

  async getByApplication(applicationId: string, userId: string, role: UserRole): Promise<Document[]> {
    await this.assertApplicationAccess(applicationId, userId, role);
    return this.docRepo.find({ where: { applicationId }, order: { createdAt: 'ASC' } });
  }

  async getDownloadUrl(
    applicationId: string,
    documentId: string,
    userId: string,
    role: UserRole,
  ): Promise<{ url: string }> {
    await this.assertApplicationAccess(applicationId, userId, role);
    const document = await this.docRepo.findOne({ where: { id: documentId, applicationId } });
    if (!document) throw new NotFoundException('Document not found.');
    return { url: await this.minioClient.presignedGetObject(this.bucket, document.minioKey, 3600) };
  }

  private async assertApplicationAccess(
    applicationId: string,
    userId: string,
    role: UserRole,
  ): Promise<void> {
    const application = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found.');
    const canReviewAll = [
      UserRole.REGISTRAR,
      UserRole.LAND_ADMINISTRATOR,
      UserRole.GOVERNOR,
    ].includes(role);
    if (!canReviewAll && application.applicantId !== userId) {
      throw new ForbiddenException('You do not have access to this application.');
    }
  }
}
