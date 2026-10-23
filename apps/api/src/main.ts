import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.setup.js';
import { AppModule } from './app.module.js';
import { loadEnvFileIfPresent } from './config/env.js';

// dist/main.js -> monorepo root .env (values already in the environment win).
loadEnvFileIfPresent(new URL('../../../.env', import.meta.url));

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.API_PORT ?? 3001);
}

await bootstrap();
