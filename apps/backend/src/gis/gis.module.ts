import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpatialVerificationService } from './spatial-verification.service';
import { GisController } from './gis.controller';
import { GisVerification } from './entities/gis-verification.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([GisVerification]), AuditModule],
  providers: [SpatialVerificationService],
  controllers: [GisController],
  exports: [SpatialVerificationService],
})
export class GisModule {}
