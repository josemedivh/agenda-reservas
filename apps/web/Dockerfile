# syntax=docker/dockerfile:1
# Turnero web (Next.js standalone server). Build from the repository root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg API_INTERNAL_URL=http://api.railway.internal:3001 \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://turnero.up.railway.app .
# Both values are fixed in the build (the /api rewrite and the links shown to owners), so a new
# address means a new build.

FROM node:22-bookworm-slim AS build
RUN npm install --global pnpm@12.11.2
WORKDIR /repo
# Manifests first, so dependencies are only reinstalled when they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @turnero/web...
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG API_INTERNAL_URL
ARG NEXT_PUBLIC_SITE_URL
# Optional: Turnero's email for privacy requests, shown on /privacidad.
ARG NEXT_PUBLIC_CONTACT_EMAIL
ENV NEXT_TELEMETRY_DISABLED=1
RUN test -n "$API_INTERNAL_URL" && test -n "$NEXT_PUBLIC_SITE_URL" \
  || (echo 'Set the API_INTERNAL_URL and NEXT_PUBLIC_SITE_URL build arguments.' && exit 1)
RUN pnpm --filter @turnero/shared run build && pnpm --filter @turnero/web run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  HOSTNAME=0.0.0.0 \
  PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
