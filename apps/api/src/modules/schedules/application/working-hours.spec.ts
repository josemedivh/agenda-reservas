import type { MembershipSummary, WorkingRange } from '@turnero/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  InvalidScheduleDataError,
  ScheduleEditForbiddenError,
  UnknownProfessionalError,
} from '../domain/errors.js';
import {
  FakeProfessionalDirectory,
  InMemoryWorkingHoursRepository,
} from '../testing/in-memory-schedules.js';
import {
  GetProfessionalWorkingHours,
  ListWorkingHours,
  ReplaceProfessionalWorkingHours,
} from './working-hours.js';

const BUSINESS = 'business-1';
const CARLOS = 'pro-carlos';
const ANDRES = 'pro-andres';

function member(role: MembershipSummary['role'], businessId = BUSINESS): MembershipSummary {
  return { businessId, businessName: 'Barbería', businessSlug: 'barberia', role };
}

function range(weekday: number, startMinute: number, endMinute: number): WorkingRange {
  return { weekday, startMinute, endMinute };
}

describe('working hours use cases', () => {
  let repository: InMemoryWorkingHoursRepository;
  let directory: FakeProfessionalDirectory;
  let replace: ReplaceProfessionalWorkingHours;

  beforeEach(() => {
    repository = new InMemoryWorkingHoursRepository();
    directory = new FakeProfessionalDirectory({ [BUSINESS]: [CARLOS, ANDRES] });
    replace = new ReplaceProfessionalWorkingHours(repository, directory);
  });

  describe('ReplaceProfessionalWorkingHours', () => {
    it('replaces the whole week and returns it sorted', async () => {
      await replace.execute(member('owner'), CARLOS, { ranges: [range(1, 540, 1080)] });

      const week = await replace.execute(member('admin'), CARLOS, {
        ranges: [range(6, 540, 780), range(2, 900, 1140), range(2, 540, 780)],
      });

      expect(week).toEqual({
        ranges: [range(2, 540, 780), range(2, 900, 1140), range(6, 540, 780)],
      });
      expect(repository.rangesOf(BUSINESS, CARLOS)).toEqual(week.ranges);
    });

    it('accepts an empty week', async () => {
      await replace.execute(member('owner'), CARLOS, { ranges: [range(1, 540, 1080)] });

      await expect(replace.execute(member('owner'), CARLOS, { ranges: [] })).resolves.toEqual({
        ranges: [],
      });
    });

    it('rejects overlapping ranges without touching the saved week', async () => {
      await replace.execute(member('owner'), CARLOS, { ranges: [range(1, 540, 1080)] });

      const attempt = replace.execute(member('owner'), CARLOS, {
        ranges: [range(2, 540, 780), range(2, 720, 1080)],
      });

      await expect(attempt).rejects.toThrow(InvalidScheduleDataError);
      await expect(attempt).rejects.toMatchObject({ message: 'Los turnos del martes se cruzan.' });
      expect(repository.rangesOf(BUSINESS, CARLOS)).toEqual([range(1, 540, 1080)]);
    });

    it('does not let employees change schedules', async () => {
      await expect(replace.execute(member('employee'), CARLOS, { ranges: [] })).rejects.toThrow(
        ScheduleEditForbiddenError,
      );
    });

    it('rejects professionals that are not from the business', async () => {
      await expect(
        replace.execute(member('owner', 'business-2'), CARLOS, { ranges: [] }),
      ).rejects.toThrow(UnknownProfessionalError);
    });
  });

  describe('reading', () => {
    it('lists the schedules of every professional with ranges, for any member', async () => {
      await replace.execute(member('owner'), CARLOS, { ranges: [range(1, 540, 1080)] });
      await replace.execute(member('owner'), ANDRES, { ranges: [range(6, 540, 780)] });

      const list = await new ListWorkingHours(repository).execute(member('employee'));

      expect(list).toEqual(
        expect.arrayContaining([
          { professionalId: CARLOS, ranges: [range(1, 540, 1080)] },
          { professionalId: ANDRES, ranges: [range(6, 540, 780)] },
        ]),
      );
    });

    it('reads one professional, empty when they have no schedule yet', async () => {
      const get = new GetProfessionalWorkingHours(repository, directory);

      await expect(get.execute(member('employee'), ANDRES)).resolves.toEqual({ ranges: [] });
      await expect(get.execute(member('owner'), 'pro-desconocido')).rejects.toThrow(
        UnknownProfessionalError,
      );
    });
  });
});
