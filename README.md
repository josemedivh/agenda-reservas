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

## Web: registro, ingreso y panel

- Páginas: `/registro`, `/ingresar` y `/panel` (protegida).
- El navegador solo habla con la web: `/api/*` se reenvía a la API (`rewrites` en `apps/web/next.config.ts`, destino `API_INTERNAL_URL`). Así la cookie de sesión pertenece al dominio de la web y el servidor de Next puede leerla.
- `apps/web/proxy.ts` redirige según exista la cookie; la validación real la hace `/panel` con `GET /auth/me`. Una sesión inválida pasa por `/sesion/caducada`, que borra la cookie.
- La API confía en `X-Forwarded-For` solo desde `TRUST_PROXY` (por defecto loopback), para que el límite de intentos cuente por visitante.

## Negocios

- `POST /businesses` crea el negocio y deja al usuario como dueño; `GET`/`PUT /businesses/:businessId` lo muestran y editan (editar: dueño o administrador). `GET /businesses/slug-availability?slug=` dice si un link está libre y sugiere otro.
- El link público (`slug`) se arma con el nombre, no se puede cambiar después y no puede usar palabras reservadas (`RESERVED_SLUGS` en `packages/shared`). Las mismas reglas valen en la web, la API y la base (`CHECK`).
- Teléfonos en formato internacional (E.164); en la web se muestran como en Ecuador.
- Web: `/panel/negocios/nuevo`, `/panel/negocios/{id}` y `/panel/negocios/{id}/datos`.

## Profesionales

- Rutas en `/businesses/:businessId/professionals`: listar, crear, ver, editar (`PUT`) y `POST …/:id/deactivate` / `…/activate`. Ver: cualquier miembro; cambiar: dueño o administrador.
- Nunca se borran: se desactivan. Hasta 5 activos por negocio (`MAX_ACTIVE_PROFESSIONALS`); el conteo bloquea la fila del negocio para que dos pedidos simultáneos no pasen el límite.
- Nombres únicos entre los activos de un negocio (sin distinguir mayúsculas), con índice único parcial en la base.
- Color de una paleta fija con contraste AA para las iniciales (`PROFESSIONAL_COLORS` en `packages/shared`).
- Web: `/panel/negocios/{id}/profesionales`, `…/nuevo` y `…/{profesionalId}`.

## Servicios

- Rutas en `/businesses/:businessId/services`: listar, crear, ver, editar (`PUT`, reemplaza datos y profesionales) y `POST …/:id/deactivate` / `…/activate`.
- Duración de 5 a 480 minutos y preparación de 0 a 60, en bloques de 5. Precio en centavos (entero, USD): la web acepta `8`, `8,50` o `8.50` y lo convierte sin decimales de punto flotante (`parsePriceToCents`).
- `service_professionals` asigna quién hace cada servicio. Las llaves foráneas compuestas `(id, business_id)` impiden asignar profesionales de otro negocio. Solo se asignan profesionales activos; una asignación existente se conserva si el profesional se desactiva.
- Web: `/panel/negocios/{id}/servicios`, `…/nuevo` y `…/{servicioId}`.

## Horarios de trabajo

- Módulo `schedules`. `GET /businesses/:businessId/working-hours` (todos los profesionales) y `GET`/`PUT /businesses/:businessId/professionals/:professionalId/working-hours` (el `PUT` reemplaza la semana completa).
- Cada turno es un día (1 = lunes … 7 = domingo) y un rango en minutos desde la medianoche en hora local del negocio (9:00 = 540; el fin no se incluye). Varios turnos por día; sin turnos que crucen la medianoche.
- La base impide turnos cruzados del mismo profesional y día con una restricción de exclusión (`btree_gist`), además de la validación en `packages/shared`.
- `schedules` pregunta al catálogo si un profesional existe a través de su caso de uso exportado (`GetProfessional`), sin leer sus tablas.
- Web: `/panel/negocios/{id}/horarios` y el editor semanal en `…/horarios/{profesionalId}`.

## Bloqueos y feriados

- `GET /businesses/:businessId/blocks` (los que no han terminado), `POST` y `DELETE …/:blockId`. Un bloqueo sin profesional aplica a todo el negocio.
- Se ingresan en la hora local del negocio, de todo el día (de una fecha a otra) o por horas en un día; la API los convierte a UTC (`timestamptz`) con la zona horaria del negocio usando `luxon` (`blockInterval` en `packages/shared`), incluidos los días con cambio de horario.
- Los bloqueos sí se borran (no están en la lista de datos que nunca se borran).
- Web: `/panel/negocios/{id}/bloqueos` y `…/bloqueos/nuevo`.

## Disponibilidad

- Módulo `availability`: no guarda nada, calcula las horas a partir de horarios, bloqueos y citas. Lee los otros módulos solo por sus casos de uso exportados.
- `GET /businesses/:businessId/availability?serviceId&date&professionalId` (las horas de un día) y `GET …/availability/days?serviceId&from&days&professionalId` (resumen por día: `closed`, `full` o `available`, hasta 31 días). Sin `professionalId` es "Cualquiera": la unión de quienes realizan el servicio, con quién está libre en cada hora.
- Horas cada 30 minutos desde el inicio de cada turno. El servicio debe caber en el turno y no cruzar un bloqueo; el tiempo de preparación ocupa al profesional después del servicio y puede pasar del cierre.
- Al menos 1 hora de anticipación y hasta 60 días por delante, contados en la zona horaria del negocio. Las horas que no existen por el cambio de horario se omiten.
- Las horas bloqueadas o pasadas no se devuelven; las ocupadas por citas sí, con `professionalIds` vacío, para mostrarlas en gris.
- Las citas que ocupan tiempo se leen del módulo `appointments` (`ListBusyTimes`); una cita cancelada libera su hora.
- Web: `/panel/negocios/{id}/disponibilidad` ("Ver disponibilidad").

## Citas y clientes

- Módulo `appointments`: dueño de las tablas `appointments` y `customers`.
- Cada cita guarda inicio, fin del servicio y `busy_until` (fin más preparación), estado (`pending`, `confirmed`, `cancelled`, `completed`, `no_show`), origen (`online` o `manual`) y una copia del nombre y el precio del servicio.
- **Sin reservas dobles:** la restricción `appointments_no_overlap` (`EXCLUDE USING gist` sobre profesional y `[starts_at, busy_until)`, salvo citas canceladas) hace que, si dos personas reservan la misma hora al mismo tiempo, solo una lo logre.
- Un cliente por teléfono dentro de cada negocio (`INSERT … ON CONFLICT`); si vuelve a reservar con otro nombre, se guarda el nuevo.
- El link del cliente lleva un código aleatorio de 144 bits; en la base solo se guarda su hash SHA-256.
- `GET /businesses/:businessId/appointments?from&days` lista las citas por días locales del negocio (cualquier miembro).
- Web: `/panel/negocios/{id}/citas` ("Próximas citas"): las citas de los próximos 14 días agrupadas por día, con el teléfono y un enlace a WhatsApp de cada cliente, y el link de reservas para copiar. Por ahora solo se pueden ver; la agenda completa llega después.

## Página pública de reservas

- Módulo `public-booking`: no guarda nada; usa los casos de uso exportados de negocios, catálogo, disponibilidad y citas. Rutas sin sesión en `/public/businesses/:slug`:
  - `GET` el negocio, sus servicios activos que alguien realiza y esos profesionales (solo nombre y color).
  - `GET …/availability` y `…/availability/days`: las mismas reglas de la disponibilidad.
  - `POST …/appointments` reserva con `serviceId`, `professionalId` (vacío = "Cualquiera"), `startsAt`, `name` y `phone` (WhatsApp), y devuelve el código del link.
  - `GET …/appointments/:code` muestra esa reserva.
- El link (`slug`) se resuelve con la función `active_business_id_by_slug` (`SECURITY DEFINER`), que solo devuelve el id de un negocio activo; un negocio suspendido o inexistente responde 404.
- Al reservar se recalcula la disponibilidad. Si la hora ya no se ofrece, responde 409.
- Con "Cualquiera", la cita va a quien tenga menos citas ese día (empates por nombre). Si a esa persona la acaban de reservar, se intenta con la siguiente.
- Límite por visitante: 10 intentos de reserva por minuto y 120 consultas por minuto.
- Web:
  - `/{slug}` es la página de reservas, pensada para celular: 1. Servicio, 2. Profesional ("Cualquiera" o uno), 3. Día y hora, 4. Nombre y WhatsApp. Si la hora se ocupó mientras el cliente llenaba los datos, se avisa y se vuelven a cargar las horas.
  - `/{slug}/reserva/{código}` muestra la reserva confirmada y el teléfono del negocio. Esta página no se indexa en buscadores.
  - Un link que no existe, o de un negocio suspendido, muestra "No encontramos esta página".
  - Las rutas fijas (`/panel`, `/ingresar`, …) tienen prioridad sobre `/{slug}`; por eso esas palabras están en `RESERVED_SLUGS`.

Si cambias el script de roles, recrea el volumen con `docker compose down -v` (borra los datos locales).

## Despliegue

- Imágenes Docker: `apps/api/Dockerfile` (corre `prisma migrate deploy` antes de cada versión desde la plataforma) y `apps/web/Dockerfile` (servidor `standalone` de Next). Se construyen desde la raíz del repositorio; la CI comprueba que compilen.
- La web envía encabezados de seguridad (HTTPS obligatorio, sin marcos de otras páginas). `/privacidad` explica qué datos se guardan y para qué.
- En una base administrada, los roles se crean una vez con `docker/postgres/production-roles.sql`.
- Pasos completos para Railway: [`docs/despliegue.md`](docs/despliegue.md).

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
