import { TIME_ZONE_OPTIONS, type MemberRole } from '@turnero/shared';

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  employee: 'Empleado',
};

/** Ecuadorian numbers the way people write them ("099 123 4567"); others stay in E.164. */
export function formatPhone(phone: string): string {
  const mobile = /^\+593(9\d)(\d{3})(\d{4})$/.exec(phone);
  if (mobile) {
    return `0${mobile[1] ?? ''} ${mobile[2] ?? ''} ${mobile[3] ?? ''}`;
  }
  const landline = /^\+593([2-7])(\d{3})(\d{4})$/.exec(phone);
  if (landline) {
    return `0${landline[1] ?? ''} ${landline[2] ?? ''} ${landline[3] ?? ''}`;
  }
  return phone;
}

export function timeZoneLabel(timeZone: string): string {
  return TIME_ZONE_OPTIONS.find((option) => option.value === timeZone)?.label ?? timeZone;
}
