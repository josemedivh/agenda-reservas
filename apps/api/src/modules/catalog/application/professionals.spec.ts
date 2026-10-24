import type { MembershipSummary } from '@turnero/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CatalogEditForbiddenError,
  InvalidCatalogDataError,
  ProfessionalLimitReachedError,
  ProfessionalNameTakenError,
  ProfessionalNotFoundError,
} from '../domain/errors.js';
import { InMemoryProfessionalRepository } from '../testing/in-memory-professionals.js';
import {
  CreateProfessional,
  GetProfessional,
  ListProfessionals,
  SetProfessionalActive,
  UpdateProfessional,
} from './professionals.js';

const BUSINESS = 'business-1';
const TEAL = '#0E5A4C';
const SKY = '#B9D7EE';

function member(role: MembershipSummary['role'], businessId = BUSINESS): MembershipSummary {
  return { businessId, businessName: 'Barbería', businessSlug: 'barberia', role };
}

describe('professional use cases', () => {
  let repository: InMemoryProfessionalRepository;
  let create: CreateProfessional;

  beforeEach(() => {
    repository = new InMemoryProfessionalRepository();
    create = new CreateProfessional(repository);
  });

  describe('CreateProfessional', () => {
    it('creates an active professional with a trimmed name', async () => {
      const created = await create.execute(member('owner'), { name: '  Carlos ', color: TEAL });

      expect(created).toEqual({
        id: expect.any(String) as string,
        name: 'Carlos',
        color: TEAL,
        active: true,
      });
    });

    it('lets admins create too, but not employees', async () => {
      await expect(
        create.execute(member('admin'), { name: 'Carlos', color: TEAL }),
      ).resolves.toBeDefined();
      await expect(
        create.execute(member('employee'), { name: 'Andrés', color: TEAL }),
      ).rejects.toThrow(CatalogEditForbiddenError);
    });

    it('rejects invalid data with the field that failed', async () => {
      const attempt = create.execute(member('owner'), { name: 'Carlos', color: '#123456' });

      await expect(attempt).rejects.toThrow(InvalidCatalogDataError);
      await expect(attempt).rejects.toMatchObject({ field: 'color' });
    });

    it('rejects a name already used by an active professional, ignoring case', async () => {
      await create.execute(member('owner'), { name: 'Carlos', color: TEAL });

      await expect(create.execute(member('owner'), { name: 'carlos', color: SKY })).rejects.toThrow(
        ProfessionalNameTakenError,
      );
    });

    it('stops at 5 active professionals', async () => {
      for (const name of ['Ana', 'Beto', 'Caro', 'Dani', 'Eli']) {
        await create.execute(member('owner'), { name, color: TEAL });
      }

      await expect(create.execute(member('owner'), { name: 'Fede', color: TEAL })).rejects.toThrow(
        ProfessionalLimitReachedError,
      );
    });
  });

  describe('ListProfessionals and GetProfessional', () => {
    it('lists active professionals first, then by name, for any member', async () => {
      const zoe = await create.execute(member('owner'), { name: 'Zoe', color: TEAL });
      await create.execute(member('owner'), { name: 'Bruno', color: TEAL });
      await create.execute(member('owner'), { name: 'Ana', color: TEAL });
      await new SetProfessionalActive(repository).execute(member('owner'), zoe.id, false);

      const list = await new ListProfessionals(repository).execute(member('employee'));

      expect(list.map(({ name, active }) => [name, active])).toEqual([
        ['Ana', true],
        ['Bruno', true],
        ['Zoe', false],
      ]);
    });

    it('does not find professionals of another business', async () => {
      const carlos = await create.execute(member('owner'), { name: 'Carlos', color: TEAL });

      await expect(
        new GetProfessional(repository).execute(member('owner', 'business-2'), carlos.id),
      ).rejects.toThrow(ProfessionalNotFoundError);
    });
  });

  describe('UpdateProfessional', () => {
    it('changes name and color', async () => {
      const carlos = await create.execute(member('owner'), { name: 'Carlos', color: TEAL });

      const updated = await new UpdateProfessional(repository).execute(member('admin'), carlos.id, {
        name: 'Carlos Mena',
        color: SKY,
      });

      expect(updated).toEqual({ ...carlos, name: 'Carlos Mena', color: SKY });
    });

    it('does not let employees edit', async () => {
      const carlos = await create.execute(member('owner'), { name: 'Carlos', color: TEAL });

      await expect(
        new UpdateProfessional(repository).execute(member('employee'), carlos.id, {
          name: 'X',
          color: TEAL,
        }),
      ).rejects.toThrow(CatalogEditForbiddenError);
    });
  });

  describe('SetProfessionalActive', () => {
    it('deactivates and reactivates, keeping the record', async () => {
      const carlos = await create.execute(member('owner'), { name: 'Carlos', color: TEAL });
      const setActive = new SetProfessionalActive(repository);

      await expect(setActive.execute(member('owner'), carlos.id, false)).resolves.toMatchObject({
        active: false,
      });
      await expect(setActive.execute(member('owner'), carlos.id, true)).resolves.toMatchObject({
        active: true,
      });
    });

    it('frees the name and the slot while inactive, and checks both when reactivating', async () => {
      const carlos = await create.execute(member('owner'), { name: 'Carlos', color: TEAL });
      const setActive = new SetProfessionalActive(repository);
      await setActive.execute(member('owner'), carlos.id, false);

      await create.execute(member('owner'), { name: 'Carlos', color: SKY });

      await expect(setActive.execute(member('owner'), carlos.id, true)).rejects.toThrow(
        ProfessionalNameTakenError,
      );
    });

    it('does not reactivate beyond the limit', async () => {
      const first = await create.execute(member('owner'), { name: 'Ana', color: TEAL });
      const setActive = new SetProfessionalActive(repository);
      await setActive.execute(member('owner'), first.id, false);
      for (const name of ['Beto', 'Caro', 'Dani', 'Eli', 'Fede']) {
        await create.execute(member('owner'), { name, color: TEAL });
      }

      await expect(setActive.execute(member('owner'), first.id, true)).rejects.toThrow(
        ProfessionalLimitReachedError,
      );
    });
  });
});
