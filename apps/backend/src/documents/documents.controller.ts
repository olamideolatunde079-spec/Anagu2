import {
  BadRequestException, Controller, Get, Param, Post, Request,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.CITIZEN,
  UserRole.SURVEYOR,
  UserRole.REGISTRAR,
  UserRole.LAND_ADMINISTRATOR,
  UserRole.GOVERNOR,
)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post(':applicationId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a land document for an application' })
  async upload(
    @Param('applicationId') applicationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('A document file is required.');
    return this.documentsService.uploadDocument({
      applicationId,
      documentType:  req.body?.documentType ?? 'OTHER',
      fileName:      file.originalname,
      fileBuffer:    file.buffer,
      mimeType:      file.mimetype,
      uploadedBy:    req.user.id,
      role:          req.user.role,
    });
  }

  @Get(':applicationId')
  @ApiOperation({ summary: 'List all documents for an application' })
  async list(@Param('applicationId') applicationId: string, @Request() req: any) {
    return this.documentsService.getByApplication(applicationId, req.user.id, req.user.role);
  }

  @Get(':applicationId/:documentId/download')
  @ApiOperation({ summary: 'Create a short-lived URL for an application document' })
  async download(
    @Param('applicationId') applicationId: string,
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return this.documentsService.getDownloadUrl(
      applicationId,
      documentId,
      req.user.id,
      req.user.role,
    );
  }
}
