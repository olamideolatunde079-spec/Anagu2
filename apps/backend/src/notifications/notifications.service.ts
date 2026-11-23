import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  async listForUser(userId: string, unreadOnly = false) {
    return this.notifRepo.find({
      where: unreadOnly ? { userId, isRead: false } : { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notif = await this.notifRepo.findOne({ where: { id: notificationId } });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.userId !== userId) {
      throw new ForbiddenException('Cannot modify another user notification.');
    }
    if (!notif.isRead) {
      notif.isRead = true;
      notif.readAt = new Date();
      await this.notifRepo.save(notif);
    }
    return notif;
  }

  async markAllRead(userId: string) {
    await this.notifRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { updated: true };
  }

  async create(params: {
    userId: string;
    category: string;
    title: string;
    body: string;
    channel?: 'IN_APP' | 'MQTT' | 'EMAIL' | 'SMS';
    entityType?: string;
    entityId?: string;
  }) {
    const notif = this.notifRepo.create({
      userId: params.userId,
      channel: params.channel ?? 'IN_APP',
      category: params.category,
      title: params.title,
      body: params.body,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
    });
    return this.notifRepo.save(notif);
  }
}
