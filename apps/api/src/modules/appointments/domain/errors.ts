export abstract class AppointmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The database refused the appointment: the professional already has one at that time. */
export class AppointmentOverlapError extends AppointmentError {
  constructor() {
    super('Esa hora acaba de ser tomada. Elige otra.');
  }
}

export class AppointmentNotFoundError extends AppointmentError {
  constructor() {
    super('No encontramos esa reserva.');
  }
}
