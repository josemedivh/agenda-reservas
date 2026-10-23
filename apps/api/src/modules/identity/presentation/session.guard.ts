import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { AuthenticateSession } from '../application/authenticate-session.js';
import type { IdentityRequest } from './request-context.js';
import { readSessionToken } from './session-cookie.js';

/** Requires a valid session cookie and exposes the user through @CurrentPrincipal(). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authenticateSession: AuthenticateSession) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IdentityRequest>();
    request.principal = await this.authenticateSession.execute(readSessionToken(request));
    return true;
  }
}
