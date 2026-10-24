import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

/** HTTP setup shared by main.ts and the integration tests. */
export function configureApp(app: NestExpressApplication): void {
  // The web app forwards /api/* to this API. Trusting its X-Forwarded-For makes req.ip (and so
  // the rate limits) the visitor's IP. Only loopback is trusted by default, so clients cannot
  // spoof the header; set TRUST_PROXY (Express "trust proxy" syntax) when deploying.
  app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
}
