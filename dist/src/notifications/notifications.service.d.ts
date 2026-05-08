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
export declare class NotificationsService {
    private readonly prisma;
    private readonly notificationsGateway;
    constructor(prisma: PrismaService, notificationsGateway: NotificationsGateway);
    createForUser(input: CreateNotificationInput): Promise<Notification>;
    listByUser(userId: string, unreadOnly: boolean, limit: number): Promise<Notification[]>;
    getByIdForUser(id: string, userId: string): Promise<Notification>;
    markAsRead(id: string, userId: string): Promise<Notification>;
}
export {};
