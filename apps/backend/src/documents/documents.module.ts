import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity';
import {
  DocumentAccessGrant,
  DocumentVerification,
} from './entities/document-verification.entity';
import { Application } from '../parcels/entities/application.entity';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentVerification,
      DocumentAccessGrant,
      Application,
    ]),
    MqttModule,
  ],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
