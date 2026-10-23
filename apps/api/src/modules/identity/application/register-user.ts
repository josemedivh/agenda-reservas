import { Injectable } from '@nestjs/common';
import { Email } from '../domain/email.js';
import { EmailAlreadyRegisteredError } from '../domain/errors.js';
import { assertPasswordPolicy } from '../domain/password-policy.js';
import { PasswordHasher, UserRepository } from './ports.js';
import { StartSession, type StartedSession } from './start-session.js';

export interface RegisterUserCommand {
  name: string;
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  userId: string;
  session: StartedSession;
}

@Injectable()
export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly startSession: StartSession,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthenticatedUser> {
    const email = Email.create(command.email);
    assertPasswordPolicy(command.password);
    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyRegisteredError();
    }

    const user = await this.users.create({
      email,
      name: command.name.trim(),
      passwordHash: await this.hasher.hash(command.password),
    });
    return { userId: user.id, session: await this.startSession.execute(user.id) };
  }
}
