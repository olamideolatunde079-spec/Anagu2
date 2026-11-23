import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';
import { Parcel } from './entities/parcel.entity';
import { Application } from './entities/application.entity';
import { GisModule } from '../gis/gis.module';
import { OracleModule } from '../oracle/oracle.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuditModule } from '../audit/audit.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parcel, Application]),
    GisModule, OracleModule, BlockchainModule, AuditModule, MqttModule,
  ],
  providers: [ParcelsService],
  controllers: [ParcelsController],
  exports: [ParcelsService],
})
export class ParcelsModule {}
