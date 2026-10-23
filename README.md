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
pnpm dev          # web en http://localhost:3000, API en http://localhost:3001
```

Comprueba la API con `GET http://localhost:3001/health`.

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
