import {
  Injectable, Logger, OnModuleInit, OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttEvent } from './entities/mqtt-event.entity';

// ── MQTT topic constants (Component 3B) ──────────────────────────────────────
export const MQTT_TOPICS = {
  REGISTRATION_SUBMITTED:          'land/registration/submitted',
  REGISTRATION_SPATIAL_VERIFIED:   'land/registration/spatial-verified',
  REGISTRATION_OWNERSHIP_VERIFIED: 'land/registration/ownership-verified',
  REGISTRATION_APPROVED:           'land/registration/approved',
  TITLE_ISSUED:                    'land/title/issued',
  TITLE_REVOKED:                   'land/title/revoked',
  REGISTRATION_REJECTED:           'land/registration/rejected',
  SYNC_OFFLINE_QUEUE:              'land/sync/offline-queue',
} as const;

export type MqttTopicKey = keyof typeof MQTT_TOPICS;

/**
 * Component 3B — MQTT Communication and Synchronisation
 *
 * Publishes real-time notifications across backend, web, and mobile clients
 * whenever a significant workflow event occurs.
 *
 * All topic payloads include a timestamp field (added automatically).
 * Byte size of each payload is stored to feed Component 4's storage-overhead table.
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client!: mqtt.MqttClient;
  private connected = false;

  constructor(
    @InjectRepository(MqttEvent)
    private readonly eventRepo: Repository<MqttEvent>,
    private readonly config: ConfigService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────
  onModuleInit() {
    const url = this.config.get<string>('MQTT_URL', 'mqtt://localhost:1883');

    this.client = mqtt.connect(url, {
      clientId:        `anagu-backend-${process.pid}`,
      clean:           true,
      reconnectPeriod: 1000,
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
    this.client.on('error', (err) => this.logger.error('MQTT error', err.message));
  }

  onModuleDestroy() {
    this.client?.end(true);
  }

  // ── Publish ───────────────────────────────────────────────────────────
  /**
   * Publish a message to a topic.
   * @param topic   MQTT topic string.
   * @param payload Payload object — timestamp is added automatically.
   * @param qos     QoS level (0 = at most once, 1 = at least once, 2 = exactly once).
   */
  async publish(
    topic: string,
    payload: Record<string, unknown>,
    qos: 0 | 1 | 2 = 1,
  ): Promise<void> {
    const fullPayload = { ...payload, timestamp: Date.now() };
    const message     = JSON.stringify(fullPayload);
    const byteSize    = Buffer.byteLength(message, 'utf8');

    // Persist the event for auditing and storage-overhead measurement
    const eventRecord = this.eventRepo.create({
      topic,
      payload:      fullPayload,
      qos,
      payloadBytes: byteSize,
      delivered:    false,
    });
    const saved = await this.eventRepo.save(eventRecord);

    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, { qos, retain: false }, async (err) => {
        if (err) {
          reject(err);
          return;
        }
        // Mark delivered
        await this.eventRepo.update(saved.id, {
          delivered:   true,
          deliveredAt: new Date(),
        });
        this.logger.debug(`Published to ${topic} (${byteSize} bytes, QoS ${qos})`);
        resolve();
      });
    });
  }

  // ── Typed publish helpers (one per topic) ─────────────────────────────
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

  // ── Subscribe ─────────────────────────────────────────────────────────
  subscribe(topic: string, handler: (payload: unknown) => void): void {
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
