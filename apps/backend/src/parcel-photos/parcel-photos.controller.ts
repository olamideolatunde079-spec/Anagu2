import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { ParcelPhotosService } from './parcel-photos.service';

@ApiTags('parcel-photos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parcels')
export class ParcelPhotosController {
  constructor(
    private readonly photosService: ParcelPhotosService,
  ) {}

  @Post(':parcelId/photos')
  @Roles(UserRole.CITIZEN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload a land parcel photo for review' })
  async uploadPhoto(
    @Param('parcelId') parcelId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.photosService.uploadPhoto(
      parcelId,
      file,
      req.user.id,
      req.user.role,
    );
  }

  @Get(':parcelId/photos/pending')
  @Roles(
    UserRole.REGISTRAR,
    UserRole.LAND_ADMINISTRATOR,
    UserRole.GOVERNOR,
  )
  @ApiOperation({ summary: 'List pending photos for a parcel' })
  async getPendingPhotos(
    @Param('parcelId') parcelId: string,
    @Request() req: any,
  ) {
    return this.photosService.getPendingPhotos(
      parcelId,
      req.user.role,
    );
  }

  @Get('photos/:photoId/review-url')
  @Roles(
    UserRole.REGISTRAR,
    UserRole.LAND_ADMINISTRATOR,
    UserRole.GOVERNOR,
  )
  @ApiOperation({ summary: 'Get a temporary preview URL for a pending photo' })
  async getReviewUrl(
    @Param('photoId') photoId: string,
    @Request() req: any,
  ) {
    return this.photosService.getPhotoReviewUrl(
      photoId,
      req.user.role,
    );
  }

  @Patch('photos/:photoId/review')
  @Roles(
    UserRole.REGISTRAR,
    UserRole.LAND_ADMINISTRATOR,
    UserRole.GOVERNOR,
  )
  @ApiOperation({ summary: 'Approve or reject a parcel photo' })
  async reviewPhoto(
    @Param('photoId') photoId: string,
    @Body() body: {
      decision: 'APPROVED' | 'REJECTED';
      rejectionReason?: string;
      isCover?: boolean;
    },
    @Request() req: any,
  ) {
    return this.photosService.reviewPhoto(
      photoId,
      req.user.id,
      req.user.role,
      body.decision,
      body.rejectionReason,
      body.isCover ?? false,
    );
  }
}
