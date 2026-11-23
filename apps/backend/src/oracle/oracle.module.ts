import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnershipVerificationService } from './ownership-verification.service';
import { OracleController } from './oracle.controller';
import { OracleVerification } from './entities/oracle-verification.entity';
import { MockRegistryAdapter } from './adapters/mock-registry.adapter';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([OracleVerification]), AuditModule],
  providers: [OwnershipVerificationService, MockRegistryAdapter],
  controllers: [OracleController],
  exports: [OwnershipVerificationService, MockRegistryAdapter],
})
export class OracleModule {}
