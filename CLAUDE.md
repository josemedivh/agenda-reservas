# Turnero: sistema de agenda y reservas

SaaS multiempresa de reservas en línea para barberías, peluquerías y salones (luego consultorios). Antes de cualquier tarea, lee `docs/especificacion.md`: es la fuente de verdad del alcance, el modelo de datos y las decisiones de diseño. Si una petición contradice la especificación, avísalo antes de implementar.

## Idioma

- Conversación, documentación y textos de la interfaz: español.
- Código (nombres de variables, clases, funciones, tablas, columnas) y mensajes de commit: inglés.

## Stack

- Monorepo con pnpm workspaces + Turborepo.
  - `apps/api`: NestJS (TypeScript estricto).
  - `apps/web`: Next.js con App Router (página pública de reservas y panel del negocio).
  - `packages/shared`: tipos, validaciones (zod) y utilidades compartidas.
- PostgreSQL + Prisma. Redis + BullMQ para colas.
- Docker Compose para levantar PostgreSQL y Redis en local.
- Pruebas: Vitest (unitarias e integración), Playwright (punta a punta).
- Calidad: ESLint + Prettier. TypeScript con `strict: true`; prohibido `any` salvo justificación en un comentario.

## Arquitectura

Monolito modular. Cada módulo de `apps/api/src/modules/<modulo>/` sigue arquitectura limpia:

```
<modulo>/
├── domain/          entidades, objetos de valor, reglas puras, errores de dominio
├── application/     casos de uso y puertos (interfaces)
├── infrastructure/  adaptadores: repositorios Prisma, proveedores externos
└── presentation/    controladores, DTOs, guards
```

Reglas:

- `domain` no importa NestJS, Prisma ni nada de otras capas.
- Los casos de uso dependen de puertos (interfaces); la infraestructura los implementa y se inyectan con NestJS.
- Un módulo no accede a las tablas de otro: se comunica por su API pública (servicios exportados) o por eventos.
- Aplicar SOLID. Clases y funciones pequeñas con una sola responsabilidad.

## Reglas de datos (obligatorias)

- Toda tabla de negocio tiene `business_id`; activar Row Level Security en PostgreSQL y fijar el negocio actual por petición. Nunca confiar solo en filtros del código.
- Fechas de citas en UTC (`timestamptz`); horarios de trabajo en hora local; conversión con la zona horaria IANA del negocio. Probar siempre con `America/Guayaquil`.
- Impedir reservas dobles con una restricción de exclusión (`btree_gist`) sobre profesional y rango de tiempo de citas activas, además de la validación en dominio.
- Dinero en centavos (enteros). Nunca `float`.
- La cita guarda copia del nombre y precio del servicio.
- Sin borrado físico de servicios, profesionales ni clientes: campo `active` o `deleted_at`.
- IDs UUID.
- Cambios de esquema solo mediante migraciones de Prisma; las restricciones que Prisma no expresa van en SQL dentro de la migración.

## Forma de trabajar

- Antes de una funcionalidad nueva, propón un plan breve y espera aprobación.
- Reglas de dominio con TDD: primero la prueba, luego el código.
- Cambios pequeños y enfocados. Una rama por funcionalidad (`feat/...`, `fix/...`).
- Commits con Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Antes de dar algo por terminado: `pnpm lint`, `pnpm typecheck` y `pnpm test` deben pasar.
- No agregar dependencias sin explicar por qué.
- Secretos solo en variables de entorno; mantener `.env.example` actualizado y nunca subir `.env`.
- Actualiza `docs/especificacion.md` si una decisión cambia, y marca las casillas del alcance al completar cada punto.

## Diseño de la interfaz

- Pensado primero para celular.
- La referencia visual y de flujos es la demo en `docs/demo/`: `reserva-cliente.html` (página pública de reservas) y `agenda-dueno.html` (agenda del negocio). Son prototipos en un formato propio de diseño, no código a reutilizar: toma de ellos colores, tipografías, textos, estados y flujos, y reconstrúyelos como componentes de Next.js. Si hay capturas de pantalla en `docs/demo/`, úsalas también como referencia.
- Fondo gris azulado claro, tinta azul marino oscuro, acento verde petróleo; títulos en Archivo Narrow y texto en Figtree.
- Accesible: botones reales, etiquetas en los campos, contraste suficiente, áreas táctiles de al menos 44 px.

## Fuera de alcance por ahora

Facturación electrónica, pagos en línea, historias clínicas y microservicios. No implementarlos sin pedirlo explícitamente.
