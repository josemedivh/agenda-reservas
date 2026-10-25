import styles from './privacy.module.css';

// Last reviewed when the text changes; shown so people know which version they read.
const UPDATED_ON = '25 de octubre de 2026';

/** Plain-language privacy notice for clients who book and for business owners. */
export function PrivacyPolicy({ contactEmail }: { contactEmail: string | null }) {
  return (
    <article className={styles.policy}>
      <h1 className={styles.title}>Privacidad</h1>
      <p className={styles.muted}>Actualizado el {UPDATED_ON}.</p>

      <section>
        <h2>Quién cuida tus datos</h2>
        <p>
          Turnero es un sistema de reservas en línea que usan barberías, peluquerías y salones.
          Cuando reservas en la página de un negocio, ese negocio decide para qué usa tus datos, y
          Turnero los guarda y los procesa por encargo suyo.
        </p>
      </section>

      <section>
        <h2>Qué datos guardamos</h2>
        <ul>
          <li>
            Si reservas una cita: tu nombre y tu número de WhatsApp, y los datos de la cita
            (servicio, profesional, fecha, hora y precio).
          </li>
          <li>
            Si administras un negocio: tu nombre, tu correo y tu contraseña (guardada cifrada, nadie
            puede leerla), además de los datos del negocio.
          </li>
          <li>
            Datos técnicos mínimos, como la dirección IP, para evitar abusos (por ejemplo, muchas
            reservas seguidas desde el mismo lugar).
          </li>
        </ul>
      </section>

      <section>
        <h2>Para qué los usamos</h2>
        <p>
          Para registrar tu cita y para que el negocio pueda contactarte sobre ella (confirmarla,
          recordártela o avisarte de un cambio). No vendemos tus datos ni los compartimos con otras
          empresas para publicidad.
        </p>
      </section>

      <section>
        <h2>Cómo los protegemos</h2>
        <p>
          Las páginas viajan cifradas (HTTPS). Cada negocio solo puede ver sus propias citas y sus
          propios clientes; la base de datos lo impide aunque hubiera un error en el sistema. El
          link de tu reserva lleva un código secreto que no se puede adivinar.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          Para reservar no usamos cookies. Quienes administran un negocio tienen una sola cookie, la
          de su sesión. No usamos cookies de publicidad ni de seguimiento.
        </p>
      </section>

      <section>
        <h2>Cuánto tiempo los guardamos</h2>
        <p>
          Mientras el negocio use Turnero, como historial de sus citas, o hasta que pidas que se
          eliminen.
        </p>
      </section>

      <section>
        <h2>Tus derechos</h2>
        <p>
          Puedes pedir ver, corregir o eliminar tus datos, o que dejen de usarse. Pídelo al negocio
          donde reservaste (su teléfono aparece en su página y en tu reserva)
          {contactEmail ? (
            <>
              {' '}
              o escríbenos a{' '}
              <a href={`mailto:${contactEmail}`} className={styles.link}>
                {contactEmail}
              </a>
            </>
          ) : null}
          .
        </p>
      </section>
    </article>
  );
}
