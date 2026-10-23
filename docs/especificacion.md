# Proyecto: Sistema de Agenda y Reservas (Turnero)

Versión del 22 de octubre de 2026. Nombre del producto provisional: **Turnero**.

## Resumen del proyecto

Construiremos un sistema web de agenda y reservas en línea para negocios de servicios, cobrado por suscripción mensual. Primero sale la agenda; la facturación electrónica llega después como plan superior.

**Problema que resuelve:** los negocios pierden clientes que no llegan a su cita y pierden tiempo contestando WhatsApp para agendar.

**Propuesta de valor:** el cliente reserva solo, las 24 horas, y recibe un recordatorio antes de la cita. El negocio ve su agenda ordenada desde el celular.

**Nichos:**

- **Para empezar:** barberías, peluquerías y salones de belleza.
- **Segunda etapa:** consultorios de salud (odontología, psicología, nutrición, fisioterapia, medicina general).

**Diferenciación:** soporte cercano por WhatsApp, configuración hecha por nosotros, precio local, enfoque por nicho y, más adelante, agenda con facturación integrada.

## Modelo de negocio

Suscripción mensual con 30 días de prueba gratis sin pedir tarjeta. Precios iniciales a validar:

| Plan | Profesionales | Precio (USD/mes) |
| --- | --- | --- |
| Prueba | Hasta 5 | 0 (30 días) |
| Básico | 1 | 10 |
| Negocio | Hasta 5 | 20 |
| Anual | Según plan | 10 meses pagados por 12 |
| Negocio + Facturación (futuro) | Hasta 5 | Por definir |

El costo variable a vigilar son los mensajes de la API oficial de WhatsApp, que se cobran por mensaje.

## Stack y arquitectura

Monolito modular en TypeScript, con arquitectura limpia (hexagonal) por módulo y principios SOLID. Sin microservicios al inicio.

| Parte | Tecnología | Motivo |
| --- | --- | --- |
| Backend (API) | NestJS | Módulos e inyección de dependencias |
| Frontend | Next.js (React) | Página pública de reservas y panel del negocio |
| Base de datos | PostgreSQL | Relaciones, seguridad por fila, restricciones contra reservas dobles |
| Acceso a datos | Prisma | Tipos y migraciones |
| Tareas en segundo plano | Redis + BullMQ | Recordatorios a la hora exacta |
| Mensajes | API oficial de WhatsApp + correo | Confirmaciones y recordatorios |
| Repositorio | Monorepo con pnpm + Turborepo | Backend, frontend y código compartido |
| Contenedores | Docker / Docker Compose | Mismo entorno en local y producción |
| Integración continua | GitHub Actions | Lint, pruebas y despliegue |
| Monitoreo | Sentry | Errores de producción |

**Módulos del monolito:** identidad y acceso, negocios, catálogo (servicios y profesionales), disponibilidad, reservas, clientes, notificaciones, suscripciones y, en el futuro, facturación.

**Capas dentro de cada módulo:**

1. **Dominio:** reglas del negocio puras, sin dependencias de frameworks ni de la base de datos.
2. **Aplicación:** casos de uso (crear, cancelar, reagendar una reserva).
3. **Infraestructura:** repositorios Prisma, proveedor de WhatsApp, servicios externos.
4. **Presentación:** controladores y DTOs de la API.

Regla: el dominio no importa nada de las capas externas. Los casos de uso dependen de interfaces (puertos), y la infraestructura las implementa (adaptadores).

**Hosting inicial:** servicio administrado (Railway, Render o Vercel para el frontend) con base de datos gestionada; migrable a AWS u otro proveedor gracias a Docker.

## Modelo de datos

Todas las tablas de negocio llevan el identificador del negocio (inquilino). La disponibilidad no se guarda: se calcula a partir de horarios, bloqueos y citas.

| Tabla | Campos principales | Notas |
| --- | --- | --- |
| Negocio | nombre, slug, teléfono, dirección, logo, zona horaria, estado | El slug forma su link público |
| Usuario | correo, contraseña cifrada, nombre | Cuenta para entrar al panel |
| Miembro | usuario, negocio, rol (dueño, administrador, empleado) | Un usuario puede manejar varios negocios |
| Profesional | nombre, color, activo, usuario (opcional) | Puede no tener cuenta propia |
| Servicio | nombre, duración, precio, tiempo de preparación, activo | Muchos a muchos con profesionales |
| Horario de trabajo | profesional, día de la semana, hora inicio, hora fin | Varios rangos por día; hora local |
| Bloqueo | inicio, fin, motivo, profesional (opcional) | Sin profesional aplica a todo el negocio |
| Cliente | nombre, teléfono, correo, notas | Único por teléfono dentro del negocio |
| Cita | profesional, servicio, cliente, inicio, fin, estado, origen, copia de nombre y precio, código de cancelación | Estados: pendiente, confirmada, cancelada, completada, no asistió |
| Notificación | cita, canal, tipo, programada para, enviada, estado, error | Confirmación y recordatorio |
| Suscripción | plan, estado, fin de prueba, fin de periodo | Estados: prueba, activa, pago atrasado, cancelada |

**Decisiones de diseño:**

1. Seguridad a nivel de fila (RLS) en PostgreSQL por negocio: un negocio nunca ve datos de otro.
2. Fechas de citas en UTC (`timestamptz`); horarios de trabajo en hora local del negocio, convertidos con su zona horaria (IANA, por ejemplo `America/Guayaquil`).
3. Restricción de exclusión en PostgreSQL (`EXCLUDE USING gist` sobre profesional y rango de tiempo) que impide dos citas activas cruzadas del mismo profesional.
4. Dinero en centavos, como enteros.
5. Copia del nombre y precio del servicio en cada cita (base para la facturación).
6. Nada se borra físicamente: servicios y profesionales se desactivan.
7. Identificadores UUID.

## Consultorios de salud (segunda etapa)

- Tabla de recursos físicos (sillón dental, sala, camilla).
- Cédula opcional y aseguradora del paciente.
- Tratamientos de varias sesiones.
- Sin historia clínica en la versión 1: los datos de salud son sensibles según la ley de protección de datos personales y requieren asesoría legal previa.

## Alcance por versión

**Versión 1**

- [ ] Registro del negocio y configuración (servicios, profesionales, horarios, bloqueos)
- [ ] Página pública de reservas con disponibilidad en tiempo real
- [ ] Agenda del negocio por día y semana, con creación manual de citas
- [ ] Confirmación y recordatorio automáticos
- [ ] Cancelar o reagendar desde el enlace del cliente
- [ ] Marcar asistencia o no asistencia
- [ ] Panel de administrador con estado de suscripciones

**Versión 2 (candidatas):** anticipo para reservar, historial y preferencias del cliente, cliente frecuente, reseñas, recordatorio para volver, recursos físicos para consultorios.

**Facturación electrónica (después):** módulo nuevo. Requiere RUC, razón social, datos de establecimiento y firma electrónica en el negocio; cédula o RUC opcional en el cliente; tabla de facturas ligada a la cita. Evaluar integrarse con un proveedor autorizado frente al SRI.

## Referencia visual

La demo navegable (reserva del cliente y agenda del dueño) define el estilo y los flujos de la versión 1: fondo gris azulado claro, tinta azul marino oscuro, acento verde petróleo, títulos en Archivo Narrow y texto en Figtree, pensado primero para celular.

## Hoja de ruta

1. Semanas 1 a 2: conversar con 10 dueños de negocios para confirmar el problema.
2. Semanas 2 a 3: demo navegable para las visitas (hecha).
3. Semanas 3 a 6: versión 1 funcional en Claude Code.
4. Semanas 6 a 10: primeros 10 negocios en prueba gratis.
5. Semanas 10 a 12: convertir a clientes pagantes y ajustar.
