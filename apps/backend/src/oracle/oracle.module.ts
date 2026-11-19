import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnershipVerificationService } from './ownership-verification.service';
import { OracleController } from './oracle.controller';
import { OracleVerification } from './entities/oracle-verification.entity';
import { Attestation } from './entities/attestation.entity';
import { AttestationService } from './attestation.service';
import { MockRegistryAdapter } from './adapters/mock-registry.adapter';
import { Application } from '../parcels/entities/application.entity';
import { AuditModule } from '../audit/audit.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OracleVerification, Attestation, Application]),
    AuditModule,
    MqttModule,
  ],
  providers: [OwnershipVerificationService, AttestationService, MockRegistryAdapter],
  controllers: [OracleController],
  exports: [OwnershipVerificationService, AttestationService, MockRegistryAdapter],
})
export class OracleModule {}
