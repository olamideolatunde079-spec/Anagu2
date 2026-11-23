import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import * as Minio from 'minio';
import * as crypto from 'crypto';

import { ParcelPhoto } from './entities/parcel-photo.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { Application } from '../parcels/entities/application.entity';
import { UserRole } from '../auth/entities/user.entity';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const SIGNED_URL_EXPIRY_SECONDS = 900;

const REVIEWER_ROLES = [
  UserRole.REGISTRAR,
  UserRole.LAND_ADMINISTRATOR,
  UserRole.GOVERNOR,
];

@Injectable()
export class ParcelPhotosService {
  private readonly logger = new Logger(ParcelPhotosService.name);
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(ParcelPhoto)
    private readonly photoRepo: Repository<ParcelPhoto>,

    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,

    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,

    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    const minioPort = Number(this.config.get<string>('MINIO_PORT', '9000'));

    if (!Number.isInteger(minioPort) || minioPort < 1 || minioPort > 65535) {
      throw new Error('MINIO_PORT must be an integer between 1 and 65535.');
    }

    this.minioClient = new Minio.Client({
      endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
      port: minioPort,
      useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get('MINIO_ROOT_USER', 'anagu_minio'),
      secretKey: this.config.get('MINIO_ROOT_PASSWORD', 'anagu_minio_secret'),
    });

    this.bucket = this.config.get('MINIO_BUCKET_PHOTOS', 'land-photos');
  }

  private detectImageType(buffer: Buffer): string | null {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return 'image/jpeg';
    }

    if (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )
    ) {
      return 'image/png';
    }

    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }

    return null;
  }

  private validateImage(file: Express.Multer.File): string {
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('An image file is required.');
    }

    if (file.size > MAX_FILE_SIZE || file.buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('Image size must not exceed 8 MB.');
    }

    if (file.buffer.length === 0) {
      throw new BadRequestException('The uploaded image is empty.');
    }

    const detectedType = this.detectImageType(file.buffer);

    if (!detectedType) {
      throw new BadRequestException('Only valid JPEG, PNG and WebP images are accepted.');
    }

    if (file.mimetype !== detectedType) {
      throw new BadRequestException('Image file content does not match its MIME type.');
    }

    return detectedType;
  }

  private async assertApplicantAccess(
    parcelId: string,
    userId: string,
    role: UserRole,
  ): Promise<Application> {
    if (role !== UserRole.CITIZEN) {
      throw new ForbiddenException('Only the citizen applicant can upload parcel photos.');
    }

    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found.');
    }

    const application = await this.applicationRepo.findOne({
      where: {
        parcelId,
        applicantId: userId,
      },
      order: { createdAt: 'DESC' },
    });

    if (!application) {
      throw new ForbiddenException(
        'You must be the applicant for this parcel before uploading photos.',
      );
    }

    if (['REJECTED', 'CANCELLED'].includes(application.status)) {
      throw new ForbiddenException(
        'Photos cannot be uploaded to a rejected or cancelled application.',
      );
    }

    return application;
  }

  async uploadPhoto(
    parcelId: string,
    file: Express.Multer.File,
    userId: string,
    role: UserRole,
  ): Promise<ParcelPhoto> {
    const application = await this.assertApplicantAccess(parcelId, userId, role);
    const mimeType = this.validateImage(file);

    const existingCount = await this.photoRepo.count({
      where: {
        parcelId,
        uploadedBy: userId,
        status: 'PENDING',
      },
    });

    if (existingCount >= 10) {
      throw new BadRequestException('You cannot have more than 10 pending photos for this parcel.');
    }

    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const objectKey = `${parcelId}/${crypto.randomUUID()}.${mimeType.split('/')[1]}`;

    await this.minioClient.putObject(
      this.bucket,
      objectKey,
      file.buffer,
      file.buffer.length,
      {
        'Content-Type': mimeType,
        'x-amz-meta-sha256': sha256,
      },
    );

    try {
      const photo = this.photoRepo.create({
        parcelId,
        applicationId: application.id,
        uploadedBy: userId,
        objectKey,
        originalFileName: file.originalname.slice(0, 255),
        mimeType,
        fileSizeBytes: String(file.buffer.length),
        sha256,
        status: 'PENDING',
        isCover: false,
        displayOrder: 0,
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      });

      const saved = await this.photoRepo.save(photo);

      this.logger.log(`Parcel photo uploaded: ${saved.id}`);
      return saved;
    } catch (error) {
      try {
        await this.minioClient.removeObject(this.bucket, objectKey);
      } catch (cleanupError) {
        this.logger.error('Could not remove orphaned photo object from MinIO.');
      }

      throw error;
    }
  }

  async getApprovedPhotos(parcelId: string) {
    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found.');
    }

    const photos = await this.photoRepo.find({
      where: {
        parcelId,
        status: 'APPROVED',
      },
      order: {
        isCover: 'DESC',
        displayOrder: 'ASC',
        createdAt: 'ASC',
      },
    });

    return Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        parcelId: photo.parcelId,
        url: await this.minioClient.presignedGetObject(
          this.bucket,
          photo.objectKey,
          SIGNED_URL_EXPIRY_SECONDS,
        ),
        mimeType: photo.mimeType,
        isCover: photo.isCover,
        displayOrder: photo.displayOrder,
        createdAt: photo.createdAt,
      })),
    );
  }

  async getPendingPhotos(
    parcelId: string,
    role: UserRole,
  ): Promise<ParcelPhoto[]> {
    this.assertReviewer(role);

    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found.');
    }

    return this.photoRepo.find({
      where: {
        parcelId,
        status: 'PENDING',
      },
      order: { createdAt: 'ASC' },
    });
  }

  async reviewPhoto(
    photoId: string,
    reviewerId: string,
    role: UserRole,
    decision: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
    isCover = false,
  ): Promise<ParcelPhoto> {
    this.assertReviewer(role);

    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      throw new BadRequestException('Review decision must be APPROVED or REJECTED.');
    }

    if (decision === 'REJECTED' && !rejectionReason?.trim()) {
      throw new BadRequestException('A rejection reason is required.');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ParcelPhoto);

      const photo = await repository.findOne({
        where: { id: photoId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!photo) {
        throw new NotFoundException('Parcel photo not found.');
      }

      if (photo.status !== 'PENDING') {
        throw new BadRequestException('This photo has already been reviewed.');
      }

      if (decision === 'APPROVED' && isCover) {
        await repository
          .createQueryBuilder()
          .update(ParcelPhoto)
          .set({ isCover: false })
          .where('parcel_id = :parcelId', { parcelId: photo.parcelId })
          .andWhere('status = :status', { status: 'APPROVED' })
          .execute();
      }

      photo.status = decision;
      photo.reviewedBy = reviewerId;
      photo.reviewedAt = new Date();
      photo.rejectionReason = decision === 'REJECTED'
        ? rejectionReason!.trim()
        : null;
      photo.isCover = decision === 'APPROVED' && isCover;

      return repository.save(photo);
    });
  }

  private assertReviewer(role: UserRole): void {
    if (!REVIEWER_ROLES.includes(role)) {
      throw new ForbiddenException('You are not authorized to review parcel photos.');
    }
  }

  async getPhotoReviewUrl(
    photoId: string,
    role: UserRole,
  ): Promise<{ url: string }> {
    this.assertReviewer(role);

    const photo = await this.photoRepo.findOne({
      where: { id: photoId, status: 'PENDING' },
    });

    if (!photo) {
      throw new NotFoundException('Pending parcel photo not found.');
    }

    return {
      url: await this.minioClient.presignedGetObject(
        this.bucket,
        photo.objectKey,
        SIGNED_URL_EXPIRY_SECONDS,
      ),
    };
  }
}
