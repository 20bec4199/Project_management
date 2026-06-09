import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import cookieParser from 'cookie-parser';
import { SocketIoAdapter } from './events/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Socket.IO adapter (custom – defers getHttpServer() until after full init)
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  // CORS – allow the frontend dev server and any configured origin
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Parse cookies (needed if you later move tokens to HttpOnly cookies)
  app.use(cookieParser());

  // Zod validation applied globally to all incoming requests
  app.useGlobalPipes(new ZodValidationPipe());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}/api`);
}
bootstrap();

