import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { AdminService } from './admin.service';
import { UpsertAdminConfigDto } from './dto/admin-config.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('configs')
  @Roles(UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR)
  @ApiQuery({ name: 'category', required: false })
  @ApiOperation({ summary: 'List system & platform administrative configurations' })
  listConfigs(@Query('category') category?: string) {
    return this.adminService.listConfigs(category);
  }

  @Patch('configs/:key')
  @Roles(UserRole.LAND_ADMINISTRATOR)
  @ApiOperation({ summary: 'Update or create an administrative configuration entry (Admin only)' })
  upsertConfig(
    @Param('key') key: string,
    @Body() dto: UpsertAdminConfigDto,
    @Request() req: any,
  ) {
    return this.adminService.upsertConfig(key, dto, req.user.id);
  }

  @Get('overview')
  @Roles(UserRole.LAND_ADMINISTRATOR, UserRole.REGISTRAR, UserRole.GOVERNOR)
  @ApiOperation({ summary: 'Get aggregated platform statistics across registrations, titles, and marketplace' })
  getOverview() {
    return this.adminService.getOverviewStats();
  }
}
