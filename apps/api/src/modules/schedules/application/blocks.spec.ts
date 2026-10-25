import type { BlockInput, MembershipSummary } from '@turnero/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BlockNotFoundError,
  InvalidScheduleDataError,
  ScheduleEditForbiddenError,
  UnknownProfessionalError,
} from '../domain/errors.js';
import {
  FakeBusinessTimeZones,
  FakeProfessionalDirectory,
  FixedClock,
  InMemoryBlockRepository,
} from '../testing/in-memory-schedules.js';
import { CreateBlock, DeleteBlock, ListBlocks } from './blocks.js';

const BUSINESS = 'business-1';
const CARLOS = '6f1c2c1e-0000-4000-8000-00000000000a';

function member(role: MembershipSummary['role'], businessId = BUSINESS): MembershipSummary {
  return { businessId, businessName: 'Barbería', businessSlug: 'barberia', role };
}

const vacations: BlockInput = {
  kind: 'allDay',
  professionalId: CARLOS,
  startDate: '2026-11-02',
  endDate: '2026-11-06',
  reason: 'Vacaciones',
};

describe('block use cases', () => {
  let blocks: InMemoryBlockRepository;
  let clock: FixedClock;
  let create: CreateBlock;

  beforeEach(() => {
    blocks = new InMemoryBlockRepository();
    clock = new FixedClock(new Date('2026-10-24T12:00:00.000Z'));
    create = new CreateBlock(
      blocks,
      new FakeProfessionalDirectory({ [BUSINESS]: [CARLOS] }),
      new FakeBusinessTimeZones({ [BUSINESS]: 'America/Guayaquil' }),
    );
  });

  describe('CreateBlock', () => {
    it('stores whole days of the business time zone as UTC instants', async () => {
      const block = await create.execute(member('owner'), vacations);

      expect(block).toEqual({
        id: expect.any(String) as string,
        professionalId: CARLOS,
        startsAt: '2026-11-02T05:00:00.000Z',
        endsAt: '2026-11-07T05:00:00.000Z',
        reason: 'Vacaciones',
      });
    });

    it('creates blocks for the whole business', async () => {
      const block = await create.execute(member('admin'), {
        kind: 'hours',
        professionalId: null,
        date: '2026-11-03',
        startTime: '14:00',
        endTime: '18:00',
        reason: null,
      });

      expect(block).toMatchObject({
        professionalId: null,
        startsAt: '2026-11-03T19:00:00.000Z',
        endsAt: '2026-11-03T23:00:00.000Z',
      });
    });

    it('rejects invalid input with the field that failed', async () => {
      const attempt = create.execute(member('owner'), { ...vacations, endDate: '2026-11-01' });

      await expect(attempt).rejects.toThrow(InvalidScheduleDataError);
      await expect(attempt).rejects.toMatchObject({ field: 'endDate' });
    });

    it('rejects professionals that are not from the business', async () => {
      await expect(
        create.execute(member('owner'), {
          ...vacations,
          professionalId: '6f1c2c1e-0000-4000-8000-0000000000ff',
        }),
      ).rejects.toThrow(UnknownProfessionalError);
    });

    it('does not let employees create blocks', async () => {
      await expect(create.execute(member('employee'), vacations)).rejects.toThrow(
        ScheduleEditForbiddenError,
      );
    });
  });

  describe('ListBlocks', () => {
    it('lists current and future blocks of the business, earliest first', async () => {
      const later = await create.execute(member('owner'), vacations);
      const sooner = await create.execute(member('owner'), {
        ...vacations,
        startDate: '2026-10-24',
        endDate: '2026-10-24',
      });
      await create.execute(member('owner'), {
        ...vacations,
        startDate: '2026-10-20',
        endDate: '2026-10-21',
      });

      const list = await new ListBlocks(blocks, clock).execute(member('employee'));

      expect(list).toEqual([sooner, later]);
    });
  });

  describe('DeleteBlock', () => {
    it('removes a block of the business', async () => {
      const block = await create.execute(member('owner'), vacations);

      await new DeleteBlock(blocks).execute(member('admin'), block.id);

      expect(await new ListBlocks(blocks, clock).execute(member('owner'))).toEqual([]);
    });

    it('answers not found for blocks of another business and forbids employees', async () => {
      const block = await create.execute(member('owner'), vacations);
      const remove = new DeleteBlock(blocks);

      await expect(remove.execute(member('owner', 'business-2'), block.id)).rejects.toThrow(
        BlockNotFoundError,
      );
      await expect(remove.execute(member('employee'), block.id)).rejects.toThrow(
        ScheduleEditForbiddenError,
      );
    });
  });
});
