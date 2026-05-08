import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

interface SocketUserPayload {
  sub: string;
}

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly configService: ConfigService) {}

  handleConnection(@ConnectedSocket() client: Socket): void {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      this.logger.error('JWT_SECRET is missing for notifications socket auth');
      client.disconnect(true);
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as SocketUserPayload;
      const userId = decoded?.sub;
      if (!userId) {
        client.disconnect(true);
        return;
      }

      client.join(this.roomForUser(userId));
    } catch {
      client.disconnect(true);
    }
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(this.roomForUser(userId)).emit(event, payload);
  }

  private roomForUser(userId: string): string {
    return `user:${userId}`;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const headerAuth = client.handshake.headers?.authorization;
    if (typeof headerAuth === 'string' && headerAuth.trim()) {
      return headerAuth.replace(/^Bearer\s+/i, '').trim();
    }

    return null;
  }
}
