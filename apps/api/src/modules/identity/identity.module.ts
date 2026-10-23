import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthenticateSession } from './application/authenticate-session.js';
import { AuthorizeBusinessMember } from './application/authorize-business-member.js';
import { GetCurrentUser } from './application/get-current-user.js';
import { LogIn } from './application/log-in.js';
import { LogOut } from './application/log-out.js';
import {
  Clock,
  MembershipReader,
  PasswordHasher,
  SessionRepository,
  SessionTokens,
  UserRepository,
} from './application/ports.js';
import { RegisterUser } from './application/register-user.js';
import { StartSession } from './application/start-session.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js';
import { CryptoSessionTokens } from './infrastructure/crypto-session-tokens.js';
import { PrismaMembershipReader } from './infrastructure/prisma-membership.reader.js';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository.js';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository.js';
import { SystemClock } from './infrastructure/system-clock.js';
import { AuthController } from './presentation/auth.controller.js';
import { BusinessMemberGuard } from './presentation/business-member.guard.js';
import { IdentityErrorFilter } from './presentation/identity-error.filter.js';
import { SessionGuard } from './presentation/session.guard.js';

/**
 * Accounts, sessions and business membership. Other modules import it to protect routes with
 * @UseGuards(SessionGuard) or @UseGuards(SessionGuard, BusinessMemberGuard).
 */
@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: SessionRepository, useClass: PrismaSessionRepository },
    { provide: MembershipReader, useClass: PrismaMembershipReader },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: SessionTokens, useClass: CryptoSessionTokens },
    { provide: Clock, useClass: SystemClock },
    { provide: APP_FILTER, useClass: IdentityErrorFilter },
    StartSession,
    RegisterUser,
    LogIn,
    LogOut,
    AuthenticateSession,
    GetCurrentUser,
    AuthorizeBusinessMember,
    SessionGuard,
    BusinessMemberGuard,
  ],
  exports: [AuthenticateSession, AuthorizeBusinessMember, SessionGuard, BusinessMemberGuard],
})
export class IdentityModule {}
