import { randomUUID } from 'node:crypto';
import type { Professional, ProfessionalInput } from '@turnero/shared';
import { ProfessionalRepository } from '../application/ports.js';
import {
  ProfessionalLimitReachedError,
  ProfessionalNameTakenError,
  ProfessionalNotFoundError,
} from '../domain/errors.js';

type Row = Professional & { businessId: string };

/** Runs synchronous work and reports its result (or thrown error) as a promise. */
function settle<T>(work: () => T): Promise<T> {
  try {
    return Promise.resolve(work());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

function toProfessional({ id, name, color, active }: Row): Professional {
  return { id, name, color, active };
}

// Test double with the same rules as the Prisma adapter. Only used by unit tests.
export class InMemoryProfessionalRepository extends ProfessionalRepository {
  readonly rows: Row[] = [];

  private ofBusiness(businessId: string): Row[] {
    return this.rows.filter((row) => row.businessId === businessId);
  }

  private assertNameFree(businessId: string, name: string, exceptId?: string): void {
    const taken = this.ofBusiness(businessId).some(
      (row) => row.active && row.id !== exceptId && row.name.toLowerCase() === name.toLowerCase(),
    );
    if (taken) {
      throw new ProfessionalNameTakenError();
    }
  }

  private assertSlotFree(businessId: string, maxActive: number): void {
    if (this.ofBusiness(businessId).filter((row) => row.active).length >= maxActive) {
      throw new ProfessionalLimitReachedError();
    }
  }

  private find(businessId: string, professionalId: string): Row {
    const row = this.ofBusiness(businessId).find((candidate) => candidate.id === professionalId);
    if (!row) {
      throw new ProfessionalNotFoundError();
    }
    return row;
  }

  list(businessId: string): Promise<Professional[]> {
    return settle(() =>
      [...this.ofBusiness(businessId)]
        .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'es'))
        .map(toProfessional),
    );
  }

  findById(businessId: string, professionalId: string): Promise<Professional | null> {
    return settle(() => {
      const row = this.ofBusiness(businessId).find((candidate) => candidate.id === professionalId);
      return row ? toProfessional(row) : null;
    });
  }

  create(businessId: string, input: ProfessionalInput, maxActive: number): Promise<Professional> {
    return settle(() => {
      this.assertSlotFree(businessId, maxActive);
      this.assertNameFree(businessId, input.name);
      const row: Row = { id: randomUUID(), businessId, ...input, active: true };
      this.rows.push(row);
      return toProfessional(row);
    });
  }

  update(
    businessId: string,
    professionalId: string,
    input: ProfessionalInput,
  ): Promise<Professional> {
    return settle(() => {
      const row = this.find(businessId, professionalId);
      if (row.active) {
        this.assertNameFree(businessId, input.name, row.id);
      }
      Object.assign(row, input);
      return toProfessional(row);
    });
  }

  setActive(
    businessId: string,
    professionalId: string,
    active: boolean,
    maxActive: number,
  ): Promise<Professional> {
    return settle(() => {
      const row = this.find(businessId, professionalId);
      if (active && !row.active) {
        this.assertSlotFree(businessId, maxActive);
        this.assertNameFree(businessId, row.name, row.id);
      }
      row.active = active;
      return toProfessional(row);
    });
  }
}
