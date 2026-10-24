export abstract class ScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidScheduleDataError extends ScheduleError {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
  }
}

export class ScheduleEditForbiddenError extends ScheduleError {
  constructor() {
    super('Solo el dueño o un administrador pueden cambiar los horarios.');
  }
}

export class UnknownProfessionalError extends ScheduleError {
  constructor() {
    super('No encontramos ese profesional.');
  }
}
