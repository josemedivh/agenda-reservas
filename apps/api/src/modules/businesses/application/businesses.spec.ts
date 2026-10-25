import type { MembershipSummary } from '@turnero/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BusinessEditForbiddenError,
  BusinessNotFoundError,
  InvalidBusinessDataError,
  SlugTakenError,
} from '../domain/errors.js';
import { InMemoryBusinessRepository } from '../testing/in-memory-businesses.js';
import { CheckSlugAvailability } from './check-slug-availability.js';
import { CreateBusiness } from './create-business.js';
import { FreeSlugFinder } from './free-slug-finder.js';
import { GetBusiness } from './get-business.js';
import { FindActiveBusinessBySlug, GetBusinessProfile } from './public-business.js';
import { UpdateBusinessDetails } from './update-business-details.js';

const input = {
  name: 'Barbería El Faro',
  slug: 'barberia-el-faro',
  phone: '099 123 4567',
  address: null,
  timeZone: 'America/Guayaquil',
};

describe('business use cases', () => {
  let businesses: InMemoryBusinessRepository;
  let createBusiness: CreateBusiness;

  beforeEach(() => {
    businesses = new InMemoryBusinessRepository();
    createBusiness = new CreateBusiness(businesses, new FreeSlugFinder(businesses));
  });

  function membershipIn(businessId: string, role: MembershipSummary['role']): MembershipSummary {
    return { businessId, businessName: 'x', businessSlug: 'x', role };
  }

  describe('CreateBusiness', () => {
    it('creates the business with the user as owner', async () => {
      const created = await createBusiness.execute('user-1', input);

      expect(created).toEqual({
        id: expect.any(String) as string,
        name: 'Barbería El Faro',
        slug: 'barberia-el-faro',
        phone: '+593991234567',
        address: null,
        timeZone: 'America/Guayaquil',
        status: 'active',
        viewerRole: 'owner',
      });
      expect(businesses.owners.get(created.id)).toBe('user-1');
    });

    it('rejects a taken slug and suggests the first free alternative', async () => {
      await createBusiness.execute('user-1', input);
      await createBusiness.execute('user-1', { ...input, slug: 'barberia-el-faro-2' });

      const attempt = createBusiness.execute('user-2', input);

      await expect(attempt).rejects.toThrow(SlugTakenError);
      await expect(attempt).rejects.toMatchObject({ suggestion: 'barberia-el-faro-3' });
    });

    it('also suggests an alternative when the slug is taken at the last moment', async () => {
      businesses.takeSlugOnNextCreate = true;

      await expect(createBusiness.execute('user-1', input)).rejects.toMatchObject({
        suggestion: 'barberia-el-faro-2',
      });
    });

    it('rejects invalid data without creating anything', async () => {
      await expect(
        createBusiness.execute('user-1', { ...input, phone: 'sin teléfono' }),
      ).rejects.toThrow(InvalidBusinessDataError);
      expect(businesses.records).toHaveLength(0);
    });
  });

  describe('CheckSlugAvailability', () => {
    it('reports a free slug', async () => {
      const check = new CheckSlugAvailability(businesses, new FreeSlugFinder(businesses));

      await expect(check.execute('Barberia-El-Faro')).resolves.toEqual({
        slug: 'barberia-el-faro',
        available: true,
        suggestion: null,
      });
    });

    it('reports a taken slug with a suggestion', async () => {
      await createBusiness.execute('user-1', input);
      const check = new CheckSlugAvailability(businesses, new FreeSlugFinder(businesses));

      await expect(check.execute('barberia-el-faro')).resolves.toEqual({
        slug: 'barberia-el-faro',
        available: false,
        suggestion: 'barberia-el-faro-2',
      });
    });
  });

  describe('GetBusiness and UpdateBusinessDetails', () => {
    it('returns the business with the role of whoever asks', async () => {
      const { id } = await createBusiness.execute('user-1', input);

      const business = await new GetBusiness(businesses).execute(membershipIn(id, 'employee'));

      expect(business).toMatchObject({ id, name: 'Barbería El Faro', viewerRole: 'employee' });
    });

    it.each(['owner', 'admin'] as const)(
      'lets an %s edit the details but not the link',
      async (role) => {
        const { id } = await createBusiness.execute('user-1', input);

        const updated = await new UpdateBusinessDetails(businesses).execute(
          membershipIn(id, role),
          {
            name: 'Barbería El Faro Norte',
            phone: '+57 310 555 1234',
            address: 'Calle 1',
            timeZone: 'Pacific/Galapagos',
          },
        );

        expect(updated).toMatchObject({
          name: 'Barbería El Faro Norte',
          slug: 'barberia-el-faro',
          phone: '+573105551234',
          address: 'Calle 1',
          timeZone: 'Pacific/Galapagos',
          viewerRole: role,
        });
      },
    );

    it('does not let an employee edit', async () => {
      const { id } = await createBusiness.execute('user-1', input);

      await expect(
        new UpdateBusinessDetails(businesses).execute(membershipIn(id, 'employee'), input),
      ).rejects.toThrow(BusinessEditForbiddenError);
    });
  });

  describe('FindActiveBusinessBySlug and GetBusinessProfile', () => {
    it('finds an active business by its link, without a membership', async () => {
      const { id } = await createBusiness.execute('user-1', input);

      await expect(
        new FindActiveBusinessBySlug(businesses).execute('barberia-el-faro'),
      ).resolves.toMatchObject({ id, name: 'Barbería El Faro', timeZone: 'America/Guayaquil' });
      await expect(new GetBusinessProfile(businesses).execute({ businessId: id })).resolves.toEqual(
        expect.objectContaining({ id, slug: 'barberia-el-faro', phone: '+593991234567' }),
      );
    });

    it('does not find unknown or suspended businesses', async () => {
      const { id } = await createBusiness.execute('user-1', input);
      const record = businesses.records.find((candidate) => candidate.id === id);
      if (record) {
        record.status = 'suspended';
      }

      await expect(
        new FindActiveBusinessBySlug(businesses).execute('barberia-el-faro'),
      ).rejects.toThrow(BusinessNotFoundError);
      await expect(
        new FindActiveBusinessBySlug(businesses).execute('otra-barberia'),
      ).rejects.toThrow(BusinessNotFoundError);
    });
  });
});
