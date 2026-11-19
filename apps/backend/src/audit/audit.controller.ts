import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR)
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'Query immutable hash-chained audit events with filters' })
  async search(
    @Query('entityType') entityType?: string,
    @Query('eventType') eventType?: string,
    @Query('actorId') actorId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.searchEvents({
      entityType,
      eventType,
      actorId,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Get(':entityType/:entityId')
  @Roles(UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR)
  @ApiOperation({ summary: 'Get immutable audit trail for an entity' })
  async getAuditTrail(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getByEntity(entityType, entityId);
  }
}
