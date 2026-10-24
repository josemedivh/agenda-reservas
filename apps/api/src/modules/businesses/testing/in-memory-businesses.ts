import { randomUUID } from 'node:crypto';
import { BusinessRepository, type BusinessRecord, type NewBusiness } from '../application/ports.js';
import type { BusinessProfile } from '../domain/business-profile.js';
import { BusinessNotFoundError, SlugTakenError } from '../domain/errors.js';

// Test double for BusinessRepository. Only used by unit tests.
export class InMemoryBusinessRepository extends BusinessRepository {
  readonly records: BusinessRecord[] = [];
  readonly owners = new Map<string, string>();
  /** Simulates another request taking the slug between the check and the insert. */
  takeSlugOnNextCreate = false;

  isSlugTaken(slug: string): Promise<boolean> {
    return Promise.resolve(this.records.some((record) => record.slug === slug));
  }

  createWithOwner(business: NewBusiness, ownerUserId: string): Promise<BusinessRecord> {
    if (this.takeSlugOnNextCreate) {
      this.takeSlugOnNextCreate = false;
      this.records.push({ ...business, id: randomUUID(), status: 'active' });
      return Promise.reject(new SlugTakenError());
    }
    const record: BusinessRecord = { ...business, id: randomUUID(), status: 'active' };
    this.records.push(record);
    this.owners.set(record.id, ownerUserId);
    return Promise.resolve(record);
  }

  findById(businessId: string): Promise<BusinessRecord | null> {
    return Promise.resolve(this.records.find((record) => record.id === businessId) ?? null);
  }

  updateProfile(businessId: string, profile: BusinessProfile): Promise<BusinessRecord> {
    const record = this.records.find((candidate) => candidate.id === businessId);
    if (!record) {
      return Promise.reject(new BusinessNotFoundError());
    }
    Object.assign(record, profile);
    return Promise.resolve(record);
  }
}
