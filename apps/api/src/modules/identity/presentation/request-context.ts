import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { MembershipSummary } from '@turnero/shared';
import type { Request } from 'express';
import type { SessionPrincipal } from '../application/authenticate-session.js';

export interface IdentityRequest extends Request {
  principal?: SessionPrincipal;
  membership?: MembershipSummary;
}

/** The signed-in user. Requires SessionGuard on the route. */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionPrincipal => {
    const { principal } = context.switchToHttp().getRequest<IdentityRequest>();
    if (!principal) {
      throw new Error('CurrentPrincipal requires SessionGuard');
    }
    return principal;
  },
);

/** Membership of the signed-in user in the business of the route. Requires BusinessMemberGuard. */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): MembershipSummary => {
    const { membership } = context.switchToHttp().getRequest<IdentityRequest>();
    if (!membership) {
      throw new Error('CurrentMembership requires BusinessMemberGuard');
    }
    return membership;
  },
);
