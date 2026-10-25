export abstract class PublicBookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The time is not offered (anymore): taken, blocked, too soon, or never offered. */
export class TimeNotAvailableError extends PublicBookingError {
  constructor() {
    super('Esa hora ya no está disponible. Elige otra.');
  }
}

export class BookingNotFoundError extends PublicBookingError {
  constructor() {
    super('No encontramos esa reserva.');
  }
}
