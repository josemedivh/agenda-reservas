import type { MembershipSummary, Professional, ServiceInput } from '@turnero/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CatalogEditForbiddenError,
  InvalidCatalogDataError,
  ServiceNameTakenError,
  ServiceNotFoundError,
} from '../domain/errors.js';
import { InMemoryProfessionalRepository } from '../testing/in-memory-professionals.js';
import { InMemoryServiceRepository } from '../testing/in-memory-services.js';
import {
  CreateService,
  GetService,
  ListServices,
  SetServiceActive,
  UpdateService,
} from './services.js';

const BUSINESS = 'business-1';
const TEAL = '#0E5A4C';

function member(role: MembershipSummary['role'], businessId = BUSINESS): MembershipSummary {
  return { businessId, businessName: 'Barbería', businessSlug: 'barberia', role };
}

describe('service use cases', () => {
  let professionals: InMemoryProfessionalRepository;
  let services: InMemoryServiceRepository;
  let carlos: Professional;
  let andres: Professional;
  let create: CreateService;
  let update: UpdateService;

  function input(overrides: Partial<ServiceInput> = {}): ServiceInput {
    return {
      name: 'Corte clásico',
      durationMinutes: 30,
      priceCents: 800,
      bufferMinutes: 5,
      professionalIds: [carlos.id],
      ...overrides,
    };
  }

  beforeEach(async () => {
    professionals = new InMemoryProfessionalRepository();
    services = new InMemoryServiceRepository();
    carlos = await professionals.create(BUSINESS, { name: 'Carlos', color: TEAL }, 5);
    andres = await professionals.create(BUSINESS, { name: 'Andrés', color: TEAL }, 5);
    create = new CreateService(services, professionals);
    update = new UpdateService(services, professionals);
  });

  describe('CreateService', () => {
    it('creates an active service with its professionals', async () => {
      const created = await create.execute(member('owner'), input({ name: '  Corte clásico ' }));

      expect(created).toEqual({
        id: expect.any(String) as string,
        name: 'Corte clásico',
        durationMinutes: 30,
        priceCents: 800,
        bufferMinutes: 5,
        active: true,
        professionalIds: [carlos.id],
      });
    });

    it('does not let employees create', async () => {
      await expect(create.execute(member('employee'), input())).rejects.toThrow(
        CatalogEditForbiddenError,
      );
    });

    it('rejects invalid data with the field that failed', async () => {
      const attempt = create.execute(member('owner'), input({ durationMinutes: 32 }));

      await expect(attempt).rejects.toThrow(InvalidCatalogDataError);
      await expect(attempt).rejects.toMatchObject({ field: 'durationMinutes' });
    });

    it('only assigns active professionals of the same business', async () => {
      await professionals.setActive(BUSINESS, andres.id, false, 5);
      const stranger = await professionals.create('business-2', { name: 'Ajeno', color: TEAL }, 5);

      for (const professionalIds of [[andres.id], [stranger.id]]) {
        const attempt = create.execute(member('owner'), input({ professionalIds }));
        await expect(attempt).rejects.toMatchObject({
          field: 'professionalIds',
          message: 'Elige profesionales activos de tu negocio.',
        });
      }
    });

    it('rejects a name already used by an active service, ignoring case', async () => {
      await create.execute(member('owner'), input());

      await expect(
        create.execute(member('owner'), input({ name: 'CORTE CLÁSICO' })),
      ).rejects.toThrow(ServiceNameTakenError);
    });
  });

  describe('UpdateService', () => {
    it('replaces the details and the professionals', async () => {
      const service = await create.execute(member('owner'), input());

      const updated = await update.execute(
        member('admin'),
        service.id,
        input({ priceCents: 900, professionalIds: [andres.id] }),
      );

      expect(updated).toMatchObject({ priceCents: 900, professionalIds: [andres.id] });
    });

    it('keeps an assignment to a professional who was deactivated afterwards', async () => {
      const service = await create.execute(
        member('owner'),
        input({ professionalIds: [carlos.id, andres.id] }),
      );
      await professionals.setActive(BUSINESS, andres.id, false, 5);

      const updated = await update.execute(
        member('owner'),
        service.id,
        input({ priceCents: 900, professionalIds: [carlos.id, andres.id] }),
      );

      expect(updated.professionalIds.sort()).toEqual([carlos.id, andres.id].sort());
    });

    it('answers not found for a service of another business', async () => {
      const service = await create.execute(member('owner'), input());

      await expect(
        update.execute(member('owner', 'business-2'), service.id, input({ professionalIds: [] })),
      ).rejects.toThrow(ServiceNotFoundError);
    });
  });

  describe('listing, reading and activation', () => {
    it('lists active services first, then by name, for any member', async () => {
      const zeta = await create.execute(member('owner'), input({ name: 'Tinte' }));
      await create.execute(member('owner'), input({ name: 'Barba' }));
      await new SetServiceActive(services).execute(member('owner'), zeta.id, false);

      const list = await new ListServices(services).execute(member('employee'));

      expect(list.map(({ name, active }) => [name, active])).toEqual([
        ['Barba', true],
        ['Tinte', false],
      ]);
    });

    it('reads one service and refuses employees changing its status', async () => {
      const service = await create.execute(member('owner'), input());

      await expect(
        new GetService(services).execute(member('employee'), service.id),
      ).resolves.toEqual(service);
      await expect(
        new SetServiceActive(services).execute(member('employee'), service.id, false),
      ).rejects.toThrow(CatalogEditForbiddenError);
    });

    it('checks the name again when reactivating', async () => {
      const old = await create.execute(member('owner'), input());
      const setActive = new SetServiceActive(services);
      await setActive.execute(member('owner'), old.id, false);
      await create.execute(member('owner'), input());

      await expect(setActive.execute(member('owner'), old.id, true)).rejects.toThrow(
        ServiceNameTakenError,
      );
    });
  });
});
