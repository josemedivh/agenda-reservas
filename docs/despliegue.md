# Despliegue en Railway

Turnero se publica en Railway como tres piezas de un mismo proyecto:

| Servicio   | Qué es                          | Acceso                                    |
| ---------- | ------------------------------- | ----------------------------------------- |
| `Postgres` | Base de datos administrada      | Solo red privada                          |
| `api`      | Imagen de `apps/api/Dockerfile` | Solo red privada (`api.railway.internal`) |
| `web`      | Imagen de `apps/web/Dockerfile` | Pública (la única con dominio)            |

El navegador solo habla con la web; la web reenvía `/api/*` a la API por la red privada. Así la API no queda expuesta a internet y la cookie de sesión pertenece al dominio de la web.

Redis todavía no se usa, así que no se crea.

## 1. Proyecto y base de datos

1. Crea una cuenta en Railway, agrega un método de pago y conecta tu cuenta de GitHub (esto lo hace el dueño de la cuenta).
2. Crea un proyecto vacío y agrega **PostgreSQL**.
3. En el servicio Postgres, activa las **copias de seguridad** (pestaña _Backups_). Sin copias no se reciben clientes reales.

## 2. Roles de la base (una sola vez)

La API nunca usa el superusuario: usa `turnero_app`, que no es dueño de nada, para que Row Level Security siempre aplique. Las migraciones usan `turnero_owner`.

1. Genera dos contraseñas nuevas y guárdalas en tu gestor de contraseñas (nunca las de desarrollo):

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(24).toString('base64url'))"
   ```

2. En Postgres → _Variables_, copia `DATABASE_PUBLIC_URL` (conexión del superusuario desde fuera de Railway).
3. Desde la raíz del repositorio, con Docker abierto, ejecuta el script de roles reemplazando los tres valores:

   ```bash
   docker run --rm -v "$PWD/docker/postgres:/sql:ro" postgres:17-alpine psql "<DATABASE_PUBLIC_URL>" -v ON_ERROR_STOP=1 -v owner_password='<clave del dueño>' -v app_password='<clave de la app>' -f /sql/production-roles.sql
   ```

   En Git Bash de Windows antepón `MSYS_NO_PATHCONV=1` y usa `$(pwd -W)` en lugar de `$PWD`. Debe responder `CREATE ROLE`, `CREATE ROLE`, `ALTER DATABASE`, `ALTER SCHEMA` y `GRANT`.

## 3. Servicio `api`

1. _New_ → _GitHub Repo_ → este repositorio. Nómbralo exactamente `api` (forma su dirección privada).
2. _Settings_ → _Config-as-code_ → ruta `/apps/api/railway.json`. Ese archivo indica el Dockerfile, corre las migraciones antes de cada versión (`prisma migrate deploy`) y revisa `/health`.
3. No generes dominio público.
4. _Variables_ (las referencias `${{…}}` las completa Railway):

   | Variable                 | Valor                                                                                                             |
   | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`           | `postgresql://turnero_app:<clave de la app>@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}`   |
   | `MIGRATION_DATABASE_URL` | `postgresql://turnero_owner:<clave del dueño>@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}` |
   | `PORT`                   | `3001` (la API escucha ahí y Railway revisa su salud en ese puerto)                                               |
   | `TRUST_PROXY`            | `1` (ver "Límite de intentos" abajo)                                                                              |
   | `WEB_ORIGIN`             | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}`                                                                          |

## 4. Servicio `web`

1. _New_ → _GitHub Repo_ → el mismo repositorio. Nómbralo `web`.
2. _Settings_ → _Config-as-code_ → ruta `/apps/web/railway.json`.
3. _Settings_ → _Networking_ → _Generate Domain_ (dirección gratuita `….up.railway.app`). Hazlo antes de la primera compilación: la dirección queda fija en el build.
4. _Variables_ (también llegan al build como argumentos del Dockerfile):

   | Variable                    | Valor                                                       |
   | --------------------------- | ----------------------------------------------------------- |
   | `API_INTERNAL_URL`          | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3001`               |
   | `NEXT_PUBLIC_SITE_URL`      | `https://${{RAILWAY_PUBLIC_DOMAIN}}`                        |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | Opcional: correo para pedidos de privacidad (`/privacidad`) |

Cada `push` a `main` vuelve a publicar solo los servicios cuyos archivos cambiaron (`watchPatterns` en cada `railway.json`).

## 5. Verificación después de publicar

- [ ] `https://<dominio>/privacidad` carga y responde con `Strict-Transport-Security`.
- [ ] Registro, ingreso y creación de un negocio de prueba (`@example.test`) desde el navegador.
- [ ] La cookie `turnero_session` llega con `Secure`, `HttpOnly` y `SameSite=Lax`.
- [ ] Reserva completa en `https://<dominio>/<slug>` y la cita aparece en "Próximas citas".
- [ ] Límite de intentos por visitante (abajo).
- [ ] Copias de seguridad activas en Postgres.
- [ ] Se borran los datos de prueba.

## Límite de intentos y `TRUST_PROXY`

El límite (10 reservas y 120 consultas por minuto) se cuenta por IP del visitante. El camino de una visita es: visitante → borde de Railway → web → API. El proxy de Next no agrega direcciones: solo reenvía el `X-Forwarded-For` que pone el borde de Railway. Por eso la API confía en **un** salto (`TRUST_PROXY=1`) y toma la última dirección de esa cabecera, que es la que agregó Railway; lo que el visitante intente falsificar queda antes y se ignora.

Prueba en producción: envía 11 intentos de reserva seguidos con una cabecera inventada distinta en cada uno, por ejemplo `-H "X-Forwarded-For: 203.0.113.<n>"`. El intento 11 debe responder 429. Si no lo hace, el borde no está agregando la IP real y hay que revisar `TRUST_PROXY` antes de recibir clientes.

Limitaciones conocidas: el contador vive en la memoria de la API (sirve mientras haya una sola instancia) y las lecturas que hace el servidor de la web para armar las páginas comparten un mismo contador de 120 por minuto.

## Dominio propio (después)

Agrega el dominio en el servicio `web` (_Networking_ → _Custom Domain_), configura el DNS que indica Railway y vuelve a publicar la web. `NEXT_PUBLIC_SITE_URL` y `WEB_ORIGIN` siguen la dirección pública si usan `RAILWAY_PUBLIC_DOMAIN`; si no, actualízalas a mano.
