import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { SpatialVerificationService } from './spatial-verification.service';
import { VerifyParcelDto } from './dto/verify-parcel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

class VerifyAndLogDto extends VerifyParcelDto {
  @IsUUID()
  parcelId: string;

  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @IsOptional()
  @IsString()
  surveyPlanNumber?: string;
}

@ApiTags('gis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gis')
export class GisController {
  constructor(private readonly gisService: SpatialVerificationService) {}

  @Post('verify')
  @ApiOperation({
    summary: 'Verify parcel geometry and check for boundary overlaps',
    description:
      'Step 1 of the registration pipeline. Validates geometry using PostGIS ST_IsValid() ' +
      'and checks for overlaps with ST_Intersects() + ST_Buffer(). ' +
      'Returns spatialHash for use as NFT metadata if valid.',
  })
  @ApiResponse({ status: 200, description: 'Verification result' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async verifyParcel(@Body() dto: VerifyParcelDto) {
    return this.gisService.verifyParcel(
      dto.coordinates,
      dto.excludeParcelId,
      dto.overlapToleranceMetres,
    );
  }

  @Post('verify-and-log')
  @Roles(UserRole.SURVEYOR, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Verify parcel and persist formal record in gis_verifications' })
  async verifyAndLog(@Body() dto: VerifyAndLogDto, @Request() req: any) {
    return this.gisService.verifyAndRecordParcel({
      parcelId: dto.parcelId,
      applicationId: dto.applicationId,
      surveyorUserId: req.user.id,
      surveyPlanNumber: dto.surveyPlanNumber,
      coordinates: dto.coordinates,
      excludeParcelId: dto.excludeParcelId,
      overlapToleranceMetres: dto.overlapToleranceMetres,
    });
  }

  @Get('parcels/search')
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'radiusMetres', required: false, type: Number })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'lga', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiOperation({ summary: 'Spatial search for parcels by radius, state, LGA, or status' })
  async searchParcels(
    @Query('lng') lng?: string,
    @Query('lat') lat?: string,
    @Query('radiusMetres') radiusMetres?: string,
    @Query('state') state?: string,
    @Query('lga') lga?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gisService.searchParcels({
      lng: lng !== undefined ? Number(lng) : undefined,
      lat: lat !== undefined ? Number(lat) : undefined,
      radiusMetres: radiusMetres !== undefined ? Number(radiusMetres) : undefined,
      state,
      lga,
      status,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Get('parcels/:parcelId/overlap-check')
  @Roles(UserRole.SURVEYOR, UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR)
  @ApiOperation({ summary: 'Check existing parcel geometry for boundary overlaps' })
  async overlapCheck(
    @Param('parcelId') parcelId: string,
    @Query('toleranceMetres') toleranceMetres?: string,
  ) {
    return this.gisService.checkOverlapByParcelId(
      parcelId,
      toleranceMetres !== undefined ? Number(toleranceMetres) : 0.5,
    );
  }

  @Get('applications/:applicationId/verifications')
  @ApiOperation({ summary: 'List GIS verification history for an application' })
  async applicationVerifications(@Param('applicationId') applicationId: string) {
    return this.gisService.getVerificationsByApplication(applicationId);
  }
}
