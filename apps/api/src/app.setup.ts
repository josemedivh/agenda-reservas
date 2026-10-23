import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** HTTP setup shared by main.ts and the integration tests. */
export function configureApp(app: INestApplication): void {
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
}
