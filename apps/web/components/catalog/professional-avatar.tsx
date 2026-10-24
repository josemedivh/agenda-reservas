import { initialsOf, professionalColor } from '@turnero/shared';
import styles from './catalog.module.css';

/** Initials on the professional's color. Decorative: the name is always shown next to it. */
export function ProfessionalAvatar(props: { name: string; color: string; testId?: string }) {
  const palette = professionalColor(props.color);
  return (
    <span
      className={styles.avatar}
      style={{ backgroundColor: palette.value, color: palette.text }}
      aria-hidden="true"
      data-testid={props.testId}
    >
      {initialsOf(props.name) || '?'}
    </span>
  );
}
