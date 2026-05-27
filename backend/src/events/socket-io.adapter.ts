import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';

/**
 * Custom Socket.IO adapter.
 *
 * The built-in IoAdapter stores `app.getHttpServer()` in its constructor,
 * which runs before NestJS finishes setting up the underlying http.Server.
 * The result is `engine.io` receiving a non-http.Server object whose
 * `.listeners()` method is missing, causing a TypeError on startup.
 *
 * Calling `getHttpServer()` lazily inside `createIOServer()` — which is
 * invoked after the full application is initialised — ensures the real
 * http.Server is always used.
 */
export class SocketIoAdapter extends IoAdapter {
  constructor(private readonly nestApp: INestApplication) {
    super(nestApp);
  }

  createIOServer(_port: number, options?: ServerOptions): Server {
    const httpServer = this.nestApp.getHttpServer();

    return new Server(httpServer, {
      ...options,
      cors: {
        origin:
          process.env.FRONTEND_URL?.split(',') ?? [
            'http://localhost:3000',
            'http://localhost:3001',
          ],
        credentials: true,
      },
    });
  }
}
