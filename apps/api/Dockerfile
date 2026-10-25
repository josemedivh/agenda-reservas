# syntax=docker/dockerfile:1
# Turnero API. Build from the repository root: docker build -f apps/api/Dockerfile .
# Migrations are not run here: the platform runs `node_modules/.bin/prisma migrate deploy`
# (with MIGRATION_DATABASE_URL) before starting each new version.

FROM node:22-bookworm-slim AS base
# Prisma's migration engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
RUN npm install --global pnpm@12.11.2
WORKDIR /repo
# Manifests first, so dependencies are only reinstalled when they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @turnero/api...
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @turnero/shared run build \
  && pnpm --filter @turnero/api run generate \
  && pnpm --filter @turnero/api run build
# A self-contained copy with production dependencies only (shared included).
RUN pnpm --filter @turnero/api deploy --prod --legacy /out

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
