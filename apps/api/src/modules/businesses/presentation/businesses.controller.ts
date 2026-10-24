import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  createBusinessSchema,
  slugSchema,
  updateBusinessSchema,
  type BusinessDetails,
  type CreateBusinessInput,
  type MembershipSummary,
  type SlugAvailabilityResponse,
  type UpdateBusinessInput,
} from '@turnero/shared';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import type { SessionPrincipal } from '../../identity/application/authenticate-session.js';
import { BusinessMemberGuard } from '../../identity/presentation/business-member.guard.js';
import {
  CurrentMembership,
  CurrentPrincipal,
} from '../../identity/presentation/request-context.js';
import { SessionGuard } from '../../identity/presentation/session.guard.js';
import { CheckSlugAvailability } from '../application/check-slug-availability.js';
import { CreateBusiness } from '../application/create-business.js';
import { GetBusiness } from '../application/get-business.js';
import { UpdateBusinessDetails } from '../application/update-business-details.js';

@Controller('businesses')
@UseGuards(SessionGuard)
export class BusinessesController {
  constructor(
    private readonly createBusiness: CreateBusiness,
    private readonly checkSlugAvailability: CheckSlugAvailability,
    private readonly getBusiness: GetBusiness,
    private readonly updateBusinessDetails: UpdateBusinessDetails,
  ) {}

  @Post()
  create(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body(new ZodValidationPipe(createBusinessSchema)) body: CreateBusinessInput,
  ): Promise<BusinessDetails> {
    return this.createBusiness.execute(principal.userId, body);
  }

  // Declared before ':businessId'. The form checks while the owner types, hence the higher limit.
  @Get('slug-availability')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  slugAvailability(
    @Query('slug', new ZodValidationPipe(slugSchema)) slug: string,
  ): Promise<SlugAvailabilityResponse> {
    return this.checkSlugAvailability.execute(slug);
  }

  @Get(':businessId')
  @UseGuards(BusinessMemberGuard)
  get(@CurrentMembership() membership: MembershipSummary): Promise<BusinessDetails> {
    return this.getBusiness.execute(membership);
  }

  /** Replaces the editable details (everything but the link). */
  @Put(':businessId')
  @UseGuards(BusinessMemberGuard)
  update(
    @CurrentMembership() membership: MembershipSummary,
    @Body(new ZodValidationPipe(updateBusinessSchema)) body: UpdateBusinessInput,
  ): Promise<BusinessDetails> {
    return this.updateBusinessDetails.execute(membership, body);
  }
}
