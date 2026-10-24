export abstract class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidBusinessDataError extends BusinessError {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
  }
}

export class SlugTakenError extends BusinessError {
  constructor(readonly suggestion: string | null = null) {
    super('Ese link ya está en uso. Elige otro.');
  }
}

export class BusinessEditForbiddenError extends BusinessError {
  constructor() {
    super('Solo el dueño o un administrador pueden editar los datos del negocio.');
  }
}

export class BusinessNotFoundError extends BusinessError {
  constructor() {
    super('No encontramos ese negocio.');
  }
}
