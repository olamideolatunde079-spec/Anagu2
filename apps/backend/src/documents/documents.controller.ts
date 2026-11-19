import {
  BadRequestException,
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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { DocumentsService } from './documents.service';
import { GrantDocumentAccessDto, VerifyDocumentDto } from './dto/documents.dto';

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
  @ApiOperation({ summary: 'Upload a private land document for an application' })
  async upload(
    @Param('applicationId') applicationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('A document file is required.');
    return this.documentsService.uploadDocument({
      applicationId,
      documentType: req.body?.documentType ?? 'OTHER',
      documentCategory: req.body?.documentCategory,
      fileName: file.originalname,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      uploadedBy: req.user.id,
      role: req.user.role,
    });
  }

  @Get(':applicationId')
  @ApiOperation({ summary: 'List all private document metadata for an application' })
  async list(@Param('applicationId') applicationId: string, @Request() req: any) {
    return this.documentsService.getByApplication(applicationId, req.user.id, req.user.role);
  }

  @Get(':applicationId/:documentId/download')
  @ApiOperation({ summary: 'Generate a short-lived signed download URL for an authorized user' })
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

  @Patch(':applicationId/:documentId/verify')
  @Roles(UserRole.SURVEYOR, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Verify or reject an uploaded document (Surveyor or Registrar only)' })
  async verify(
    @Param('applicationId') applicationId: string,
    @Param('documentId') documentId: string,
    @Body() dto: VerifyDocumentDto,
    @Request() req: any,
  ) {
    return this.documentsService.verifyDocument(
      applicationId,
      documentId,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  @Post(':applicationId/:documentId/grants')
  @ApiOperation({ summary: 'Grant time-limited access to a private document' })
  async grantAccess(
    @Param('applicationId') applicationId: string,
    @Param('documentId') documentId: string,
    @Body() dto: GrantDocumentAccessDto,
    @Request() req: any,
  ) {
    return this.documentsService.grantAccess(
      applicationId,
      documentId,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  @Get(':applicationId/:documentId/grants')
  @ApiOperation({ summary: 'List active access grants for a private document' })
  async listGrants(
    @Param('applicationId') applicationId: string,
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return this.documentsService.listGrants(
      applicationId,
      documentId,
      req.user.id,
      req.user.role,
    );
  }
}
