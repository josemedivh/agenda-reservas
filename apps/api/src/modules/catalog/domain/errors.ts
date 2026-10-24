import { MAX_ACTIVE_PROFESSIONALS } from '@turnero/shared';

export abstract class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCatalogDataError extends CatalogError {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
  }
}

export class CatalogEditForbiddenError extends CatalogError {
  constructor() {
    super('Solo el dueño o un administrador pueden cambiar los profesionales y servicios.');
  }
}

export class ProfessionalNotFoundError extends CatalogError {
  constructor() {
    super('No encontramos ese profesional.');
  }
}

export class ProfessionalNameTakenError extends CatalogError {
  constructor() {
    super('Ya tienes un profesional activo con ese nombre.');
  }
}

export class ProfessionalLimitReachedError extends CatalogError {
  constructor() {
    super(
      `Puedes tener hasta ${String(MAX_ACTIVE_PROFESSIONALS)} profesionales activos. Desactiva uno para agregar otro.`,
    );
  }
}

export class ServiceNotFoundError extends CatalogError {
  constructor() {
    super('No encontramos ese servicio.');
  }
}

export class ServiceNameTakenError extends CatalogError {
  constructor() {
    super('Ya tienes un servicio activo con ese nombre.');
  }
}
