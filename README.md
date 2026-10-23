# Turnero

Sistema de agenda y reservas en línea para barberías, peluquerías y salones. El alcance, el modelo de datos y las decisiones de diseño están en [`docs/especificacion.md`](docs/especificacion.md); la demo visual, en [`docs/demo/`](docs/demo/).

## Estructura

```
apps/
  api/       API en NestJS (monolito modular, módulos en src/modules)
  web/       Next.js con App Router (reservas públicas y panel del negocio)
packages/
  shared/    tipos, esquemas zod y utilidades compartidas
docs/        especificación y demo navegable
```

## Requisitos

- Node.js 22.13 o superior (ver `.nvmrc`)
- pnpm 12 (`corepack enable` toma la versión de `package.json`)
- Docker con Docker Compose

## Primeros pasos

```bash
cp .env.example .env
pnpm install
pnpm db:up        # PostgreSQL en :5432 y Redis en :6379
pnpm db:deploy    # aplica las migraciones de Prisma
pnpm dev          # web en http://localhost:3000, API en http://localhost:3001
```

Comprueba la API con `GET http://localhost:3001/health`.

## Base de datos

PostgreSQL usa dos roles, creados por `docker/postgres/init/01-roles.sh` al crear el volumen:

- `turnero_owner`: dueño del esquema; solo corre migraciones (`MIGRATION_DATABASE_URL`).
- `turnero_app`: lo usa la API (`DATABASE_URL`). No es dueño de nada, así que Row Level Security siempre aplica.

Las tablas de negocio solo son visibles dentro de `TenantTransactionRunner.run(businessId, ...)`, que fija el negocio actual en la transacción. Fuera de ella, las políticas no devuelven filas.

Las pruebas de integración usan la base `turnero_test` (`TEST_DATABASE_URL`) y necesitan `pnpm db:up`.

## Autenticación

El módulo `identity` (`apps/api/src/modules/identity`) maneja cuentas y sesiones:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` y `GET /auth/me`.
- La sesión es un token aleatorio en la cookie `turnero_session` (`httpOnly`, `SameSite=Lax`, `Secure` en producción); en la base solo se guarda su hash SHA-256. Dura 30 días.
- Contraseñas con Argon2id. Login y registro tienen límite de 10 intentos por minuto.
- Para proteger una ruta: `@UseGuards(SessionGuard)`. Para rutas de un negocio (`/businesses/:businessId/...`): `@UseGuards(SessionGuard, BusinessMemberGuard)` y `@CurrentMembership()` para obtener el negocio y el rol.

Si cambias el script de roles, recrea el volumen con `docker compose down -v` (borra los datos locales).

## Scripts

| Comando                | Qué hace                                           |
| ---------------------- | -------------------------------------------------- |
| `pnpm dev`             | Levanta web, API y `shared` en modo watch          |
| `pnpm build`           | Compila todos los paquetes                         |
| `pnpm lint`            | ESLint en todo el monorepo                         |
| `pnpm typecheck`       | Revisión de tipos con TypeScript                   |
| `pnpm test`            | Pruebas con Vitest                                 |
| `pnpm format`          | Formatea con Prettier (`format:check` solo revisa) |
| `pnpm db:up`/`db:down` | Levanta o detiene PostgreSQL y Redis               |

Antes de dar una tarea por terminada deben pasar `pnpm lint`, `pnpm typecheck` y `pnpm test`.
