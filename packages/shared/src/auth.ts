import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;

export const memberRoles = ['owner', 'admin', 'employee'] as const;
export type MemberRole = (typeof memberRoles)[number];

const emailSchema = z
  .string({ error: 'Ingresa tu correo.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Ingresa un correo válido.' }));

export const registerSchema = z.object({
  name: z
    .string({ error: 'Ingresa tu nombre.' })
    .trim()
    .min(1, { error: 'Ingresa tu nombre.' })
    .max(NAME_MAX_LENGTH, {
      error: `El nombre no puede tener más de ${String(NAME_MAX_LENGTH)} caracteres.`,
    }),
  email: emailSchema,
  password: z
    .string({ error: 'Ingresa una contraseña.' })
    .min(PASSWORD_MIN_LENGTH, {
      error: `La contraseña debe tener al menos ${String(PASSWORD_MIN_LENGTH)} caracteres.`,
    })
    .max(PASSWORD_MAX_LENGTH, {
      error: `La contraseña no puede tener más de ${String(PASSWORD_MAX_LENGTH)} caracteres.`,
    }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'Ingresa tu contraseña.' })
    .min(1, { error: 'Ingresa tu contraseña.' })
    .max(PASSWORD_MAX_LENGTH, { error: 'Correo o contraseña incorrectos.' }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface MembershipSummary {
  businessId: string;
  businessName: string;
  businessSlug: string;
  role: MemberRole;
}

export interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  memberships: MembershipSummary[];
}
