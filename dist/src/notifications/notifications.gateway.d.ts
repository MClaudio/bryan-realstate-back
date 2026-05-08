import { OnGatewayConnection } from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
export declare class NotificationsGateway implements OnGatewayConnection {
    private readonly configService;
    private readonly logger;
    private server;
    constructor(configService: ConfigService);
    handleConnection(client: Socket): void;
    emitToUser(userId: string, event: string, payload: unknown): void;
    private roomForUser;
    private extractToken;
}
