import type { BusinessDetails, MemberRole } from '@turnero/shared';
import type { BusinessRecord } from './ports.js';

export function toBusinessDetails(record: BusinessRecord, viewerRole: MemberRole): BusinessDetails {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    phone: record.phone,
    address: record.address,
    timeZone: record.timeZone,
    status: record.status,
    viewerRole,
  };
}
