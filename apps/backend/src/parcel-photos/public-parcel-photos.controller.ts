import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ParcelPhotosService } from './parcel-photos.service';

@ApiTags('public-parcel-photos')
@Controller('public/parcels')
export class PublicParcelPhotosController {
  constructor(
    private readonly photosService: ParcelPhotosService,
  ) {}

  @Get(':parcelId/photos')
  @ApiOperation({
    summary: 'Get approved public photos for a land parcel',
  })
  async getApprovedPhotos(
    @Param('parcelId') parcelId: string,
  ) {
    return this.photosService.getApprovedPhotos(parcelId);
  }
}
