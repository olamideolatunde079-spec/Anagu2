import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import { Document, DocumentCategory } from './entities/document.entity';
import {
  DocumentAccessGrant,
  DocumentVerification,
} from './entities/document-verification.entity';
import { Application } from '../parcels/entities/application.entity';
import { UserRole } from '../auth/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { MqttService } from '../mqtt/mqtt.service';
import { GrantDocumentAccessDto, VerifyDocumentDto } from './dto/documents.dto';

const ALLOWED_CATEGORIES: DocumentCategory[] = [
  'IDENTITY',
  'SURVEY',
  'OWNERSHIP_PROOF',
  'LEGAL',
  'CERTIFICATE',
  'CORRESPONDENCE',
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
];

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private minioClient: Minio.Client;
  private readonly maxBytes: number;
  private readonly buckets: Record<DocumentCategory, string>;

  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @InjectRepository(DocumentVerification)
    private readonly verifRepo: Repository<DocumentVerification>,
    @InjectRepository(DocumentAccessGrant)
    private readonly grantRepo: Repository<DocumentAccessGrant>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    private readonly config: ConfigService,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly mqttService?: MqttService,
  ) {
    const minioPort = Number(this.config.get<string>('MINIO_PORT', '9000'));
    if (!Number.isInteger(minioPort) || minioPort < 1 || minioPort > 65535) {
      throw new Error('MINIO_PORT must be an integer between 1 and 65535.');
    }

    const accessKey =
      this.config.get<string>('MINIO_APP_USER') ??
      this.config.get<string>('MINIO_ROOT_USER', '');
    const secretKey =
      this.config.get<string>('MINIO_APP_PASSWORD') ??
      this.config.get<string>('MINIO_ROOT_PASSWORD', '');

    if (this.config.get<string>('NODE_ENV') === 'production' && (!accessKey || !secretKey)) {
      throw new Error('MinIO credentials must be configured in production.');
    }

    this.minioClient = new Minio.Client({
      endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
      port: minioPort,
      useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: accessKey || 'anagu_local_dev',
      secretKey: secretKey || 'anagu_local_dev_secret',
    });

    this.maxBytes = Number(this.config.get<string>('MAX_DOCUMENT_SIZE_BYTES', '26214400'));
    const docsBucket = this.config.get('MINIO_BUCKET_DOCUMENTS', 'land-documents');
    this.buckets = {
      OWNERSHIP_PROOF: docsBucket,
      LEGAL: docsBucket,
      CORRESPONDENCE: docsBucket,
      SURVEY: this.config.get('MINIO_BUCKET_SURVEYS', 'survey-plans'),
      CERTIFICATE: this.config.get('MINIO_BUCKET_CERTIFICATES', 'title-certificates'),
      IDENTITY: this.config.get('MINIO_BUCKET_IDENTITY', 'identity-documents'),
    };
  }

  async uploadDocument(params: {
    applicationId: string;
    documentType: string;
    documentCategory?: string;
    fileName: string;
    fileBuffer: Buffer;
    mimeType: string;
    uploadedBy: string;
    role: UserRole;
  }): Promise<Document> {
    const application = await this.assertApplicationAccess(
      params.applicationId,
      params.uploadedBy,
      params.role,
    );

    if (!ALLOWED_MIME_TYPES.includes(params.mimeType)) {
      throw new BadRequestException('Only PDF, JPEG, PNG, and TIFF documents are accepted.');
    }
    if (!params.fileBuffer?.length || params.fileBuffer.length > this.maxBytes) {
      throw new BadRequestException(`Document size must be between 1 byte and ${this.maxBytes} bytes.`);
    }

    const category: DocumentCategory = ALLOWED_CATEGORIES.includes(
      params.documentCategory as DocumentCategory,
    )
      ? (params.documentCategory as DocumentCategory)
      : this.inferCategory(params.documentType);

    const bucketName = this.buckets[category];
    const safeFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileHash = crypto.createHash('sha256').update(params.fileBuffer).digest('hex');
    const minioKey = `${params.applicationId}/${category.toLowerCase()}/${Date.now()}-${safeFileName}`;

    await this.minioClient.putObject(
      bucketName,
      minioKey,
      params.fileBuffer,
      params.fileBuffer.length,
      {
        'Content-Type': params.mimeType,
        'x-amz-meta-sha256': fileHash,
        'x-amz-meta-category': category,
      },
    );

    const doc = this.docRepo.create({
      applicationId: params.applicationId,
      parcelId: application.parcelId,
      documentType: params.documentType,
      documentCategory: category,
      fileName: safeFileName,
      bucketName,
      minioKey,
      mimeType: params.mimeType,
      fileHash,
      fileSizeBytes: String(params.fileBuffer.length),
      visibility: 'PRIVATE',
      isPrivate: true,
      encryptionAlg: 'AES256',
      checksumVerified: true,
      reviewStatus: 'PENDING',
      uploadedBy: params.uploadedBy,
    });

    await this.docRepo.save(doc);

    await this.auditService?.log({
      entityType: 'document',
      entityId: doc.id,
      eventType: 'DOCUMENT_UPLOADED',
      toStatus: 'PENDING',
      actorRole: params.role,
      actorId: params.uploadedBy,
      metadata: {
        applicationId: params.applicationId,
        bucketName,
        category,
        fileHash,
        sizeBytes: params.fileBuffer.length,
      },
    });

    try {
      await this.mqttService?.publish('land/document/uploaded', {
        applicationId: params.applicationId,
        documentId: doc.id,
        category,
      }, 1);
    } catch {
      // Non-fatal if MQTT broker offline
    }

    this.logger.log(`Private document uploaded to ${bucketName}/${minioKey}`);
    return doc;
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
  ): Promise<{ url: string; expiresInSeconds: number; bucket: string; checksumSha256: string }> {
    const document = await this.docRepo.findOne({ where: { id: documentId, applicationId } });
    if (!document) throw new NotFoundException('Document not found.');

    await this.assertDocumentAccess(applicationId, documentId, userId, role);

    const expirySeconds = 300;
    const url = await this.minioClient.presignedGetObject(
      document.bucketName,
      document.minioKey,
      expirySeconds,
    );

    return {
      url,
      expiresInSeconds: expirySeconds,
      bucket: document.bucketName,
      checksumSha256: document.fileHash,
    };
  }

  async verifyDocument(
    applicationId: string,
    documentId: string,
    dto: VerifyDocumentDto,
    verifierId: string,
    verifierRole: UserRole,
  ) {
    const document = await this.docRepo.findOne({ where: { id: documentId, applicationId } });
    if (!document) throw new NotFoundException('Document not found.');

    const checksumMatched = dto.expectedSha256
      ? dto.expectedSha256.toLowerCase() === document.fileHash.toLowerCase()
      : true;

    const record = this.verifRepo.create({
      documentId: document.id,
      verifiedBy: verifierId,
      decision: dto.decision,
      computedSha256: document.fileHash,
      checksumMatched,
      notes: dto.notes ?? null,
    });
    const savedVerif = await this.verifRepo.save(record);

    const prevStatus = document.reviewStatus;
    document.reviewStatus = dto.decision === 'VERIFIED' ? 'VERIFIED' : 'REJECTED';
    document.checksumVerified = checksumMatched;
    document.verifiedBy = verifierId;
    document.verifiedAt = new Date();
    await this.docRepo.save(document);

    await this.auditService?.log({
      entityType: 'document',
      entityId: document.id,
      eventType: `DOCUMENT_${dto.decision}`,
      fromStatus: prevStatus,
      toStatus: document.reviewStatus,
      actorRole: verifierRole,
      actorId: verifierId,
      metadata: { checksumMatched, notes: dto.notes ?? null },
    });

    return { document, verification: savedVerif };
  }

  async grantAccess(
    applicationId: string,
    documentId: string,
    dto: GrantDocumentAccessDto,
    actorId: string,
    actorRole: UserRole,
  ) {
    await this.assertApplicationAccess(applicationId, actorId, actorRole);
    if (!dto.granteeUserId && !dto.granteeRole) {
      throw new BadRequestException('Either granteeUserId or granteeRole must be provided.');
    }

    const document = await this.docRepo.findOne({ where: { id: documentId, applicationId } });
    if (!document) throw new NotFoundException('Document not found.');

    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 3600 * 1000)
      : new Date(Date.now() + 24 * 3600 * 1000);

    const grant = this.grantRepo.create({
      documentId: document.id,
      granteeUserId: dto.granteeUserId ?? null,
      granteeRole: dto.granteeRole ?? null,
      accessLevel: dto.accessLevel,
      grantedBy: actorId,
      expiresAt,
    });
    const saved = await this.grantRepo.save(grant);

    await this.auditService?.log({
      entityType: 'document_access_grant',
      entityId: saved.id,
      eventType: 'DOCUMENT_ACCESS_GRANTED',
      actorRole,
      actorId,
      metadata: {
        documentId,
        granteeUserId: dto.granteeUserId ?? null,
        granteeRole: dto.granteeRole ?? null,
        accessLevel: dto.accessLevel,
      },
    });

    return saved;
  }

  async listGrants(applicationId: string, documentId: string, actorId: string, actorRole: UserRole) {
    await this.assertApplicationAccess(applicationId, actorId, actorRole);
    return this.grantRepo.find({
      where: { documentId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  private inferCategory(documentType: string): DocumentCategory {
    const upper = documentType.toUpperCase();
    if (upper.includes('NIN') || upper.includes('ID') || upper.includes('PASSPORT')) return 'IDENTITY';
    if (upper.includes('SURVEY') || upper.includes('BEACON') || upper.includes('PLAN')) return 'SURVEY';
    if (upper.includes('CERT') || upper.includes('COFO')) return 'CERTIFICATE';
    if (upper.includes('COURT') || upper.includes('LEGAL') || upper.includes('GAZETTE')) return 'LEGAL';
    return 'OWNERSHIP_PROOF';
  }

  private async assertApplicationAccess(
    applicationId: string,
    userId: string,
    role: UserRole,
  ): Promise<Application> {
    const application = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found.');
    const canReviewAll = [
      UserRole.SURVEYOR,
      UserRole.REGISTRAR,
      UserRole.LAND_ADMINISTRATOR,
      UserRole.GOVERNOR,
    ].includes(role);
    if (!canReviewAll && application.applicantId !== userId) {
      throw new ForbiddenException('You do not have access to this application.');
    }
    return application;
  }

  private async assertDocumentAccess(
    applicationId: string,
    documentId: string,
    userId: string,
    role: UserRole,
  ) {
    try {
      await this.assertApplicationAccess(applicationId, userId, role);
      return;
    } catch (err) {
      if (!(err instanceof ForbiddenException)) throw err;
    }

    const grants = await this.grantRepo.find({
      where: { documentId, revokedAt: IsNull() },
    });
    const now = Date.now();
    const hasGrant = grants.some(
      (g) =>
        (!g.expiresAt || g.expiresAt.getTime() > now) &&
        (g.granteeUserId === userId || g.granteeRole === role),
    );
    if (!hasGrant) {
      throw new ForbiddenException('You do not have access to download this private document.');
    }
  }
}
