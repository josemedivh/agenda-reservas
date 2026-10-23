import { Injectable } from '@nestjs/common';
import { Email } from '../domain/email.js';
import { InvalidCredentialsError, InvalidEmailError } from '../domain/errors.js';
import { PasswordHasher, UserRepository, type UserAccount } from './ports.js';
import type { AuthenticatedUser } from './register-user.js';
import { StartSession } from './start-session.js';

export interface LogInCommand {
  email: string;
  password: string;
}

@Injectable()
export class LogIn {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly startSession: StartSession,
  ) {}

  async execute(command: LogInCommand): Promise<AuthenticatedUser> {
    const user = await this.findUser(command.email);
    // Always verify, even for unknown users, so response time does not reveal registered emails.
    const passwordMatches = await this.hasher.verify(command.password, user?.passwordHash ?? null);
    if (!user || !passwordMatches) {
      throw new InvalidCredentialsError();
    }
    return { userId: user.id, session: await this.startSession.execute(user.id) };
  }

  private async findUser(rawEmail: string): Promise<UserAccount | null> {
    try {
      return await this.users.findByEmail(Email.create(rawEmail));
    } catch (error) {
      if (error instanceof InvalidEmailError) {
        return null;
      }
      throw error;
    }
  }
}
