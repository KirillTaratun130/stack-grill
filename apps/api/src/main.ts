import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { AppModule } from './app.module.js';
import { appRouter } from './trpc/router.js';
import { createContext } from './trpc/context.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.use(
    '/trpc',
    createExpressMiddleware({ router: appRouter, createContext }),
  );

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
