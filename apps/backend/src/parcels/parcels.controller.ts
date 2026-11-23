import {
  Body, Controller, Get, Param, Patch,
  Post, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { RolesGuard }    from '../auth/guards/roles.guard';
import { Roles }         from '../auth/decorators/roles.decorator';
import { UserRole }      from '../auth/entities/user.entity';
import { ParcelsService } from './parcels.service';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  // ── GET /api/v1/applications ─────────────────────────────────────────────
  // Citizens see their own; registrar/admin/governor see all
  @Get()
  @ApiOperation({ summary: 'List applications (own for citizens; all for admin roles)' })
  @ApiResponse({ status: 200, description: 'Array of applications' })
  async findAll(@Request() req: any) {
    return this.parcelsService.findAllApplications(req.user.id, req.user.role);
  }

  // ── POST /api/v1/applications ────────────────────────────────────────────
  @Post()
  @Roles(UserRole.CITIZEN, UserRole.SURVEYOR, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Submit a new land registration application' })
  async submit(@Body() body: any, @Request() req: any) {
    return this.parcelsService.submitApplication({
      ...body,
      applicantId: req.user.id,
    });
  }

  // ── GET /api/v1/applications/:id ─────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  async getOne(@Param('id') id: string) {
    return this.parcelsService.findApplicationById(id);
  }

  // ── PATCH /api/v1/applications/:id/approve ───────────────────────────────
  @Patch(':id/approve')
  @Roles(UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR)
  @ApiOperation({ summary: 'Approve an application (registrar/admin only)' })
  async approve(@Param('id') id: string, @Request() req: any) {
    return this.parcelsService.approveApplication(id, req.user.id);
  }

  // ── PATCH /api/v1/applications/:id/reject ────────────────────────────────
  @Patch(':id/reject')
  @Roles(UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR)
  @ApiOperation({ summary: 'Reject an application (registrar/admin only)' })
  async reject(
    @Param('id') id: string,
    @Body() body: { stage: string; reason: string },
    @Request() req: any,
  ) {
    return this.parcelsService.rejectApplication(id, body.stage, body.reason, req.user.id);
  }
}
