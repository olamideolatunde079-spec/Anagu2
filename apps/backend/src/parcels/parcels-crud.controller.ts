import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ParcelsService } from './parcels.service';

@ApiTags('parcels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parcels')
export class ParcelsCrudController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'lga', required: false })
  @ApiOperation({ summary: 'List land parcels (own parcels for citizens; all for institutional roles)' })
  list(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('state') state?: string,
    @Query('lga') lga?: string,
  ) {
    return this.parcelsService.listParcels(req.user.id, req.user.role, { status, state, lga });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cadastral parcel details, GeoJSON geometry, GIS checks, and title info' })
  getOne(@Param('id') id: string, @Request() req: any) {
    return this.parcelsService.getParcelDetails(id, req.user.id, req.user.role);
  }

  @Get(':id/ownership')
  @ApiOperation({ summary: 'Get parcel blockchain title ownership ledger history' })
  getOwnershipHistory(@Param('id') id: string) {
    return this.parcelsService.getParcelOwnershipHistory(id);
  }
}
