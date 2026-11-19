import {
  Injectable, Logger, OnModuleInit, OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttEvent } from './entities/mqtt-event.entity';

export const MQTT_TOPICS = {
  REGISTRATION_SUBMITTED:          'land/registration/submitted',
  REGISTRATION_SPATIAL_VERIFIED:   'land/registration/spatial-verified',
  REGISTRATION_OWNERSHIP_VERIFIED: 'land/registration/ownership-verified',
  REGISTRATION_APPROVED:           'land/registration/approved',
  REGISTRATION_REJECTED:           'land/registration/rejected',
  SURVEY_VERIFIED:                 'land/survey/verified',
  REVIEW_LEGAL_CLEARED:            'land/review/legal-cleared',
  DOCUMENT_UPLOADED:               'land/document/uploaded',
  TITLE_ISSUED:                    'land/title/issued',
  TITLE_REVOKED:                   'land/title/revoked',
  TRANSFER_COMPLETED:              'land/transfer/completed',
  TRANSFER_SETTLED:                'land/transfer/settled',
  MARKETPLACE_LISTED:              'land/marketplace/listed',
  MARKETPLACE_ESCROW_LOCKED:       'land/marketplace/escrow-locked',
  SYNC_OFFLINE_QUEUE:              'land/sync/offline-queue',
} as const;

export type MqttTopicKey = keyof typeof MQTT_TOPICS;

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client?: mqtt.MqttClient;
  private connected = false;

  constructor(
    @InjectRepository(MqttEvent)
    private readonly eventRepo: Repository<MqttEvent>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('MQTT_URL', 'mqtt://localhost:1883');

    this.client = mqtt.connect(url, {
      clientId:        `anagu-backend-${process.pid}`,
      clean:           true,
      reconnectPeriod: 5000,
      keepalive:       60,
      username:        this.config.get('MQTT_USERNAME') || undefined,
      password:        this.config.get('MQTT_PASSWORD') || undefined,
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log(`MQTT connected to ${url}`);
    });

    this.client.on('reconnect', () => this.logger.warn('MQTT reconnecting...'));
    this.client.on('offline', () => {
      this.connected = false;
      this.logger.warn('MQTT offline');
    });
    this.client.on('error', (err) => this.logger.warn(`MQTT error: ${err.message}`));
  }

  onModuleDestroy() {
    this.client?.end(true);
  }

  async publish(
    topic: string,
    payload: Record<string, unknown>,
    qos: 0 | 1 | 2 = 1,
  ): Promise<void> {
    const fullPayload = { ...payload, timestamp: Date.now() };
    const message     = JSON.stringify(fullPayload);
    const byteSize    = Buffer.byteLength(message, 'utf8');

    const eventRecord = this.eventRepo.create({
      topic,
      payload:      fullPayload,
      qos,
      payloadBytes: byteSize,
      delivered:    false,
    });
    const saved = await this.eventRepo.save(eventRecord);

    if (!this.client || !this.connected) {
      this.logger.warn(`MQTT broker disconnected — event ${saved.id} queued in mqtt_events (${topic})`);
      return;
    }

    return new Promise((resolve) => {
      this.client!.publish(topic, message, { qos, retain: false }, async (err) => {
        if (err) {
          this.logger.warn(`Failed to publish MQTT ${topic}: ${err.message}`);
          await this.eventRepo.update(saved.id, { errorMessage: err.message });
          resolve();
          return;
        }
        await this.eventRepo.update(saved.id, {
          delivered:   true,
          deliveredAt: new Date(),
        });
        this.logger.debug(`Published to ${topic} (${byteSize} bytes, QoS ${qos})`);
        resolve();
      });
    });
  }

  async publishRegistrationSubmitted(applicationId: string, ownerId: string, parcelId: string) {
    return this.publish(MQTT_TOPICS.REGISTRATION_SUBMITTED,
      { applicationId, ownerId, parcelId }, 1);
  }

  async publishSpatialVerified(applicationId: string, parcelId: string) {
    return this.publish(MQTT_TOPICS.REGISTRATION_SPATIAL_VERIFIED,
      { applicationId, parcelId }, 1);
  }

  async publishOwnershipVerified(applicationId: string, ownerId: string) {
    return this.publish(MQTT_TOPICS.REGISTRATION_OWNERSHIP_VERIFIED,
      { applicationId, ownerId }, 1);
  }

  async publishApproved(applicationId: string, registrarId: string) {
    return this.publish(MQTT_TOPICS.REGISTRATION_APPROVED,
      { applicationId, registrarId }, 2);
  }

  async publishTitleIssued(
    applicationId: string, tokenId: string,
    parcelId: string, ownerId: string, txHash: string,
  ) {
    return this.publish(MQTT_TOPICS.TITLE_ISSUED,
      { applicationId, tokenId, parcelId, ownerId, txHash }, 2);
  }

  async publishTitleRevoked(
    tokenId: string, ground: number, revokedBy: string, parcelId: string,
  ) {
    return this.publish(MQTT_TOPICS.TITLE_REVOKED,
      { tokenId, ground, revokedBy, parcelId }, 2);
  }

  async publishRejected(applicationId: string, stage: string, reason: string) {
    return this.publish(MQTT_TOPICS.REGISTRATION_REJECTED,
      { applicationId, stage, reason }, 1);
  }

  subscribe(topic: string, handler: (payload: unknown) => void): void {
    if (!this.client) return;
    this.client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) this.logger.error(`Failed to subscribe to ${topic}`, err);
      else this.logger.log(`Subscribed to ${topic}`);
    });
    this.client.on('message', (t, msg) => {
      if (t === topic) {
        try {
          handler(JSON.parse(msg.toString()));
        } catch (e) {
          this.logger.error(`Failed to parse message on ${topic}`, e);
        }
      }
    });
  }

  isConnected(): boolean {
    return this.connected;
  }
}
