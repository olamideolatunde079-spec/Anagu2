import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { PublicTitlesController } from './public-titles.controller';
import { LandTitle } from './entities/land-title.entity';
import { AuditModule } from '../audit/audit.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [TypeOrmModule.forFeature([LandTitle]), AuditModule, MqttModule],
  providers: [BlockchainService],
  controllers: [BlockchainController, PublicTitlesController],
  exports: [BlockchainService],
})
export class BlockchainModule {}
