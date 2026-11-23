import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ParcelPhotosService } from './parcel-photos.service';
import { ParcelPhotosController } from './parcel-photos.controller';
import { PublicParcelPhotosController } from './public-parcel-photos.controller';
import { ParcelPhoto } from './entities/parcel-photo.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { Application } from '../parcels/entities/application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParcelPhoto,
      Parcel,
      Application,
    ]),
  ],
  providers: [ParcelPhotosService],
  controllers: [
    ParcelPhotosController,
    PublicParcelPhotosController,
  ],
  exports: [ParcelPhotosService],
})
export class ParcelPhotosModule {}
