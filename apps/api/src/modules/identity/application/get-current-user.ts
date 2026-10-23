import { Injectable } from '@nestjs/common';
import type { CurrentUserResponse } from '@turnero/shared';
import { NotAuthenticatedError } from '../domain/errors.js';
import { MembershipReader, UserRepository } from './ports.js';

@Injectable()
export class GetCurrentUser {
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: MembershipReader,
  ) {}

  async execute(userId: string): Promise<CurrentUserResponse> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotAuthenticatedError();
    }
    return {
      user: { id: user.id, email: user.email, name: user.name },
      memberships: await this.memberships.listForUser(userId),
    };
  }
}
