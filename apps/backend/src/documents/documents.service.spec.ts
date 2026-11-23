import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { UserRole } from '../auth/entities/user.entity';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let docRepo: any;
  let verifRepo: any;
  let grantRepo: any;
  let appRepo: any;
  let auditService: any;

  beforeEach(() => {
    docRepo = {
      create: jest.fn((x) => ({ id: 'doc-1', ...x })),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    verifRepo = {
      create: jest.fn((x) => ({ id: 'verif-1', ...x })),
      save: jest.fn(async (x) => x),
    };
    grantRepo = {
      create: jest.fn((x) => ({ id: 'grant-1', ...x })),
      save: jest.fn(async (x) => x),
      find: jest.fn().mockResolvedValue([]),
    };
    appRepo = { findOne: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue({}) };

    const config = {
      get: jest.fn((k: string, d?: string) => {
        if (k === 'MINIO_PORT') return '9000';
        if (k === 'MAX_DOCUMENT_SIZE_BYTES') return '26214400';
        return d;
      }),
    } as unknown as ConfigService;

    service = new DocumentsService(docRepo, verifRepo, grantRepo, appRepo, config, auditService);
    (service as any).minioClient = {
      putObject: jest.fn().mockResolvedValue({}),
      presignedGetObject: jest.fn().mockResolvedValue('https://minio.local/signed'),
    };
  });

  it('routes SURVEY uploads to private survey-plans bucket with SHA-256 checksum', async () => {
    appRepo.findOne.mockResolvedValue({
      id: 'app-1',
      parcelId: 'parcel-1',
      applicantId: 'citizen-1',
    });

    const doc = await service.uploadDocument({
      applicationId: 'app-1',
      documentType: 'SURVEY_PLAN',
      fileName: 'beacon-plan.pdf',
      fileBuffer: Buffer.from('sample pdf bytes'),
      mimeType: 'application/pdf',
      uploadedBy: 'citizen-1',
      role: UserRole.CITIZEN,
    });

    expect(doc.bucketName).toBe('survey-plans');
    expect(doc.isPrivate).toBe(true);
    expect(doc.visibility).toBe('PRIVATE');
    expect(doc.fileHash).toHaveLength(64);
  });

  it('rejects unsupported MIME types', async () => {
    appRepo.findOne.mockResolvedValue({ id: 'app-1', applicantId: 'citizen-1' });
    await expect(
      service.uploadDocument({
        applicationId: 'app-1',
        documentType: 'SCRIPT',
        fileName: 'evil.exe',
        fileBuffer: Buffer.from('1234'),
        mimeType: 'application/x-msdownload',
        uploadedBy: 'citizen-1',
        role: UserRole.CITIZEN,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows private download only via ownership or active DocumentAccessGrant', async () => {
    appRepo.findOne.mockResolvedValue({ id: 'app-1', applicantId: 'citizen-1' });
    docRepo.findOne.mockResolvedValue({
      id: 'doc-1',
      applicationId: 'app-1',
      bucketName: 'land-documents',
      minioKey: 'app-1/doc.pdf',
      fileHash: 'a'.repeat(64),
    });

    await expect(
      service.getDownloadUrl('app-1', 'doc-1', 'other-user', UserRole.CITIZEN),
    ).rejects.toThrow(ForbiddenException);

    grantRepo.find.mockResolvedValue([
      {
        granteeUserId: 'other-user',
        granteeRole: null,
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);

    const res = await service.getDownloadUrl('app-1', 'doc-1', 'other-user', UserRole.CITIZEN);
    expect(res.url).toBe('https://minio.local/signed');
    expect(res.expiresInSeconds).toBe(300);
  });
});
