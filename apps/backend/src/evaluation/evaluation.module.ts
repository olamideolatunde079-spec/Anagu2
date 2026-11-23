import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { BaselineSimulatorService } from './baseline-simulator.service';
import { GisModule } from '../gis/gis.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { OracleModule } from '../oracle/oracle.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [GisModule, BlockchainModule, OracleModule, MqttModule],
  providers: [EvaluationService, BaselineSimulatorService],
  controllers: [EvaluationController],
})
export class EvaluationModule {}
