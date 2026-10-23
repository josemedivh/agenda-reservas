export abstract class IdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidEmailError extends IdentityError {
  constructor() {
    super('Ingresa un correo válido.');
  }
}

export class WeakPasswordError extends IdentityError {
  constructor(minLength: number, maxLength: number) {
    super(`La contraseña debe tener entre ${String(minLength)} y ${String(maxLength)} caracteres.`);
  }
}

export class EmailAlreadyRegisteredError extends IdentityError {
  constructor() {
    super('Ya existe una cuenta con ese correo.');
  }
}

export class InvalidCredentialsError extends IdentityError {
  constructor() {
    super('Correo o contraseña incorrectos.');
  }
}

export class NotAuthenticatedError extends IdentityError {
  constructor() {
    super('Inicia sesión para continuar.');
  }
}

export class BusinessAccessDeniedError extends IdentityError {
  constructor() {
    super('No tienes acceso a este negocio.');
  }
}
