import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { UserRepository, type NewUserAccount, type UserAccount } from '../application/ports.js';
import type { Email } from '../domain/email.js';
import { EmailAlreadyRegisteredError } from '../domain/errors.js';

const USER_FIELDS = { id: true, email: true, name: true, passwordHash: true } as const;

// The users table is global (no RLS), so the plain client is used here.
@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findByEmail(email: Email): Promise<UserAccount | null> {
    return this.prisma.user.findUnique({ where: { email: email.value }, select: USER_FIELDS });
  }

  findById(id: string): Promise<UserAccount | null> {
    return this.prisma.user.findUnique({ where: { id }, select: USER_FIELDS });
  }

  async create(user: NewUserAccount): Promise<UserAccount> {
    try {
      return await this.prisma.user.create({
        data: { email: user.email.value, name: user.name, passwordHash: user.passwordHash },
        select: USER_FIELDS,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }
}
