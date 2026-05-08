import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, NotificationActionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  path?: string;
  actionType?: NotificationActionType;
  modalKey?: string;
  entityType?: string;
  entityId?: string;
  payload?: unknown;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createForUser(input: CreateNotificationInput): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        path: input.path,
        actionType: input.actionType ?? NotificationActionType.NAVIGATE,
        modalKey: input.modalKey,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: (input.payload as object | undefined) ?? undefined,
      },
    });

    this.notificationsGateway.emitToUser(
      input.userId,
      'notification.created',
      notification,
    );

    return notification;
  }

  listByUser(userId: string, unreadOnly: boolean, limit: number): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getByIdForUser(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    await this.getByIdForUser(id, userId);

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
