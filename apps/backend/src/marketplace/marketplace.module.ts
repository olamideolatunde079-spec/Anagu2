import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  LandTransfer,
  MarketplaceListing,
  PaymentTransaction,
  PlatformCommission,
  SettlementRecord,
} from './entities/marketplace.entity';
import { LandTitle } from '../blockchain/entities/land-title.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuditModule } from '../audit/audit.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarketplaceListing,
      LandTransfer,
      PaymentTransaction,
      PlatformCommission,
      SettlementRecord,
      LandTitle,
    ]),
    BlockchainModule,
    AuditModule,
    MqttModule,
  ],
  providers: [MarketplaceService],
  controllers: [MarketplaceController],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
