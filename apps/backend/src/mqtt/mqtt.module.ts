import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { MqttEvent } from './entities/mqtt-event.entity';

@Global() // MqttService is used across all modules
@Module({
  imports: [TypeOrmModule.forFeature([MqttEvent])],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
