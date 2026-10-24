import { randomUUID } from 'node:crypto';
import type { Service, ServiceInput } from '@turnero/shared';
import { ServiceRepository } from '../application/ports.js';
import { ServiceNameTakenError, ServiceNotFoundError } from '../domain/errors.js';

type Row = Service & { businessId: string };

/** Runs synchronous work and reports its result (or thrown error) as a promise. */
function settle<T>(work: () => T): Promise<T> {
  try {
    return Promise.resolve(work());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

function toService(row: Row): Service {
  const { id, name, durationMinutes, priceCents, bufferMinutes, active } = row;
  return {
    id,
    name,
    durationMinutes,
    priceCents,
    bufferMinutes,
    active,
    professionalIds: [...row.professionalIds],
  };
}

// Test double with the same rules as the Prisma adapter. Only used by unit tests.
export class InMemoryServiceRepository extends ServiceRepository {
  readonly rows: Row[] = [];

  private ofBusiness(businessId: string): Row[] {
    return this.rows.filter((row) => row.businessId === businessId);
  }

  private assertNameFree(businessId: string, name: string, exceptId?: string): void {
    const taken = this.ofBusiness(businessId).some(
      (row) => row.active && row.id !== exceptId && row.name.toLowerCase() === name.toLowerCase(),
    );
    if (taken) {
      throw new ServiceNameTakenError();
    }
  }

  private find(businessId: string, serviceId: string): Row {
    const row = this.ofBusiness(businessId).find((candidate) => candidate.id === serviceId);
    if (!row) {
      throw new ServiceNotFoundError();
    }
    return row;
  }

  list(businessId: string): Promise<Service[]> {
    return settle(() =>
      [...this.ofBusiness(businessId)]
        .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'es'))
        .map(toService),
    );
  }

  findById(businessId: string, serviceId: string): Promise<Service | null> {
    return settle(() => {
      const row = this.ofBusiness(businessId).find((candidate) => candidate.id === serviceId);
      return row ? toService(row) : null;
    });
  }

  create(businessId: string, input: ServiceInput): Promise<Service> {
    return settle(() => {
      this.assertNameFree(businessId, input.name);
      const row: Row = { id: randomUUID(), businessId, ...input, active: true };
      this.rows.push(row);
      return toService(row);
    });
  }

  update(businessId: string, serviceId: string, input: ServiceInput): Promise<Service> {
    return settle(() => {
      const row = this.find(businessId, serviceId);
      if (row.active) {
        this.assertNameFree(businessId, input.name, row.id);
      }
      Object.assign(row, input);
      return toService(row);
    });
  }

  setActive(businessId: string, serviceId: string, active: boolean): Promise<Service> {
    return settle(() => {
      const row = this.find(businessId, serviceId);
      if (active && !row.active) {
        this.assertNameFree(businessId, row.name, row.id);
      }
      row.active = active;
      return toService(row);
    });
  }
}
