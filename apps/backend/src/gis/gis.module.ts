import { Module } from '@nestjs/common';
import { SpatialVerificationService } from './spatial-verification.service';
import { GisController } from './gis.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [SpatialVerificationService],
  controllers: [GisController],
  exports: [SpatialVerificationService],
})
export class GisModule {}
