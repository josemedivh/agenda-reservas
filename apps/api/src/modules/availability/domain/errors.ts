export abstract class AvailabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ServiceNotBookableError extends AvailabilityError {
  constructor() {
    super('Ese servicio no existe o no está activo.');
  }
}

export class ProfessionalNotForServiceError extends AvailabilityError {
  constructor() {
    super('Ese profesional no realiza este servicio.');
  }
}
