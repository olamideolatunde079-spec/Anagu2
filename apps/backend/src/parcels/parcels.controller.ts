import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { ParcelsService } from './parcels.service';
import {
  LegalReviewDto,
  RejectApplicationDto,
  ResubmitApplicationDto,
  SubmitApplicationDto,
  SurveyReviewDto,
} from './dto/applications.dto';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Get()
  @ApiOperation({ summary: 'List applications (own for citizens/surveyors; all for oversight roles)' })
  @ApiResponse({ status: 200, description: 'Array of applications' })
  async findAll(@Request() req: any) {
    return this.parcelsService.findAllApplications(req.user.id, req.user.role);
  }

  @Post()
  @Roles(UserRole.CITIZEN, UserRole.SURVEYOR, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Submit a new land registration application' })
  async submit(@Body() dto: SubmitApplicationDto, @Request() req: any) {
    return this.parcelsService.submitApplication(
      { ...dto, applicantId: req.user.id },
      req.user.role,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID (enforces ownership for citizens)' })
  async getOne(@Param('id') id: string, @Request() req: any) {
    return this.parcelsService.findApplicationByIdAuthorized(id, req.user.id, req.user.role);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get application status transitions, survey verifications, and legal review history' })
  async getHistory(@Param('id') id: string, @Request() req: any) {
    return this.parcelsService.getApplicationHistory(id, req.user.id, req.user.role);
  }

  @Patch(':id/survey-review')
  @Roles(UserRole.SURVEYOR)
  @ApiOperation({ summary: 'Record surveyor verification decision (Licensed Surveyor only)' })
  async surveyReview(
    @Param('id') id: string,
    @Body() dto: SurveyReviewDto,
    @Request() req: any,
  ) {
    return this.parcelsService.performSurveyReview(id, dto, req.user.id);
  }

  @Patch(':id/legal-review')
  @Roles(UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Record statutory legal & encumbrance review (Registrar only)' })
  async legalReview(
    @Param('id') id: string,
    @Body() dto: LegalReviewDto,
    @Request() req: any,
  ) {
    return this.parcelsService.performLegalReview(id, dto, req.user.id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Grant statutory approval (Registrar only — platform administrators excluded)' })
  async approve(@Param('id') id: string, @Request() req: any) {
    return this.parcelsService.approveApplication(id, req.user.id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Reject an application (Registrar only)' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectApplicationDto,
    @Request() req: any,
  ) {
    return this.parcelsService.rejectApplication(id, dto.stage, dto.reason, req.user.id, req.user.role);
  }

  @Patch(':id/resubmit')
  @Roles(UserRole.CITIZEN, UserRole.SURVEYOR, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Resubmit a rejected application with updated details/coordinates' })
  async resubmit(
    @Param('id') id: string,
    @Body() dto: ResubmitApplicationDto,
    @Request() req: any,
  ) {
    return this.parcelsService.resubmitApplication(id, dto, req.user.id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.CITIZEN, UserRole.SURVEYOR, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Withdraw/cancel an active application before title issuance' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.parcelsService.cancelApplication(id, req.user.id);
  }
}
