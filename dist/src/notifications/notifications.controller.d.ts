import { NotificationsService } from './notifications.service';
interface AuthenticatedRequest {
    user: {
        userId: string;
    };
}
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    list(req: AuthenticatedRequest, unreadOnly?: string, limit?: string): Promise<{
        path: string | null;
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        actionType: import("@prisma/client").$Enums.NotificationActionType;
        modalKey: string | null;
        entityType: string | null;
        entityId: string | null;
        payload: import("@prisma/client/runtime/client").JsonValue | null;
        isRead: boolean;
        readAt: Date | null;
    }[]>;
    getOne(req: AuthenticatedRequest, id: string): Promise<{
        path: string | null;
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        actionType: import("@prisma/client").$Enums.NotificationActionType;
        modalKey: string | null;
        entityType: string | null;
        entityId: string | null;
        payload: import("@prisma/client/runtime/client").JsonValue | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    markAsRead(req: AuthenticatedRequest, id: string): Promise<{
        path: string | null;
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        actionType: import("@prisma/client").$Enums.NotificationActionType;
        modalKey: string | null;
        entityType: string | null;
        entityId: string | null;
        payload: import("@prisma/client/runtime/client").JsonValue | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
}
export {};
