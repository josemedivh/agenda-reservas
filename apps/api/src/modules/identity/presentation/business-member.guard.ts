import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { AuthorizeBusinessMember } from '../application/authorize-business-member.js';
import { BusinessAccessDeniedError, NotAuthenticatedError } from '../domain/errors.js';
import type { IdentityRequest } from './request-context.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * For routes under /businesses/:businessId. Use after SessionGuard. Exposes the membership
 * through @CurrentMembership(); handlers pass its businessId to TenantTransactionRunner.
 */
@Injectable()
export class BusinessMemberGuard implements CanActivate {
  constructor(private readonly authorizeBusinessMember: AuthorizeBusinessMember) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IdentityRequest>();
    if (!request.principal) {
      throw new NotAuthenticatedError();
    }
    const businessId = request.params['businessId'];
    if (typeof businessId !== 'string' || !UUID_PATTERN.test(businessId)) {
      throw new BusinessAccessDeniedError();
    }
    request.membership = await this.authorizeBusinessMember.execute(
      request.principal.userId,
      businessId.toLowerCase(),
    );
    return true;
  }
}
