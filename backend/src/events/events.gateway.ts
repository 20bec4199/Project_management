import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/auth.types';

// Extend Socket to carry the authenticated user
interface AuthenticatedSocket extends Socket {
  user: JwtPayload;
}

@WebSocketGateway()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);

      if (!token) throw new Error('Missing token');

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      (client as AuthenticatedSocket).user = payload;

      // Each user gets a personal room for targeted notifications
      await client.join(`user:${payload.sub}`);

      this.logger.log(
        `Connected: ${client.id}  user=${payload.sub}`,
      );
    } catch {
      this.logger.warn(`Rejected unauthenticated connection: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Disconnected: ${client.id}`);
  }

  // ── Room management (client-initiated) ────────────────────────────────────

  /** Client emits "join-org" with orgId to subscribe to org-level events. */
  @SubscribeMessage('join-org')
  async handleJoinOrg(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() orgId: string,
  ) {
    await client.join(`org:${orgId}`);
    this.logger.log(`${client.id} joined org:${orgId}`);
    return { event: 'joined', data: orgId };
  }

  /** Client emits "leave-org" to unsubscribe. */
  @SubscribeMessage('leave-org')
  async handleLeaveOrg(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() orgId: string,
  ) {
    await client.leave(`org:${orgId}`);
    return { event: 'left', data: orgId };
  }

  // ── Emit helpers (called by server-side services) ─────────────────────────

  emitTaskCreated(orgId: string, task: unknown): void {
    this.server.to(`org:${orgId}`).emit('task:created', task);
  }

  emitTaskUpdated(orgId: string, task: unknown): void {
    this.server.to(`org:${orgId}`).emit('task:updated', task);
  }

  emitTaskDeleted(orgId: string, taskId: string): void {
    this.server.to(`org:${orgId}`).emit('task:deleted', { id: taskId });
  }

  /** Push a notification to a specific user's personal room. */
  emitNotification(userId: string, notification: unknown): void {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
