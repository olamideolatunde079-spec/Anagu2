import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SpatialVerificationService } from './spatial-verification.service';
import { VerifyParcelDto } from './dto/verify-parcel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('gis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gis')
export class GisController {
  constructor(private readonly gisService: SpatialVerificationService) {}

  /**
   * POST /api/v1/gis/verify
   * Component 1 — Spatial verification entry point.
   */
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
}
