import type {
  Block,
  BusinessScope,
  Professional,
  ProfessionalSchedule,
  Service,
} from '@turnero/shared';
import type {
  AppointmentReader,
  BusinessTimeZones,
  BusyInterval,
  CatalogReader,
  Clock,
  ScheduleReader,
} from '../application/ports.js';

// One test double for every availability port. Only used by unit tests.
export class FakeAvailabilitySources
  implements CatalogReader, ScheduleReader, BusinessTimeZones, AppointmentReader, Clock
{
  services: Service[];
  professionals: Professional[];
  schedules: ProfessionalSchedule[];
  blocks: Block[] = [];
  busy: BusyInterval[] = [];
  private readonly currentTime: Date;
  private readonly zone: string;

  constructor(data: {
    now: Date;
    timeZone: string;
    services: Service[];
    professionals: Professional[];
    schedules: ProfessionalSchedule[];
  }) {
    this.currentTime = data.now;
    this.zone = data.timeZone;
    this.services = data.services;
    this.professionals = data.professionals;
    this.schedules = data.schedules;
  }

  findService(_scope: BusinessScope, serviceId: string): Promise<Service | null> {
    return Promise.resolve(this.services.find((service) => service.id === serviceId) ?? null);
  }

  listProfessionals(): Promise<Professional[]> {
    return Promise.resolve(this.professionals);
  }

  workingHours(): Promise<ProfessionalSchedule[]> {
    return Promise.resolve(this.schedules);
  }

  upcomingBlocks(): Promise<Block[]> {
    return Promise.resolve(this.blocks);
  }

  timeZoneOf(): Promise<string> {
    return Promise.resolve(this.zone);
  }

  busyIntervals(_scope: BusinessScope, from: Date, to: Date): Promise<BusyInterval[]> {
    return Promise.resolve(
      this.busy.filter((interval) => interval.startsAt < to && interval.endsAt > from),
    );
  }

  now(): Date {
    return this.currentTime;
  }
}
