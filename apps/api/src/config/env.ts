import { existsSync } from 'node:fs';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

/** Loads a .env file when it exists; variables already set in the environment are kept. */
export function loadEnvFileIfPresent(file: URL): void {
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}
