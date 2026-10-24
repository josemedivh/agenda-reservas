import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  serviceInputSchema,
  type MembershipSummary,
  type Service,
  type ServiceInput,
} from '@turnero/shared';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { BusinessMemberGuard } from '../../identity/presentation/business-member.guard.js';
import { CurrentMembership } from '../../identity/presentation/request-context.js';
import { SessionGuard } from '../../identity/presentation/session.guard.js';
import {
  CreateService,
  GetService,
  ListServices,
  SetServiceActive,
  UpdateService,
} from '../application/services.js';
import { ServiceNotFoundError } from '../domain/errors.js';

/** A malformed id cannot match any service. */
const serviceIdPipe = new ParseUUIDPipe({ exceptionFactory: () => new ServiceNotFoundError() });
const inputPipe = new ZodValidationPipe(serviceInputSchema);

@Controller('businesses/:businessId/services')
@UseGuards(SessionGuard, BusinessMemberGuard)
export class ServicesController {
  constructor(
    private readonly listServices: ListServices,
    private readonly getService: GetService,
    private readonly createService: CreateService,
    private readonly updateService: UpdateService,
    private readonly setServiceActive: SetServiceActive,
  ) {}

  @Get()
  list(@CurrentMembership() membership: MembershipSummary): Promise<Service[]> {
    return this.listServices.execute(membership);
  }

  @Post()
  create(
    @CurrentMembership() membership: MembershipSummary,
    @Body(inputPipe) body: ServiceInput,
  ): Promise<Service> {
    return this.createService.execute(membership, body);
  }

  @Get(':serviceId')
  get(
    @CurrentMembership() membership: MembershipSummary,
    @Param('serviceId', serviceIdPipe) serviceId: string,
  ): Promise<Service> {
    return this.getService.execute(membership, serviceId);
  }

  /** Replaces the details and the assigned professionals. */
  @Put(':serviceId')
  update(
    @CurrentMembership() membership: MembershipSummary,
    @Param('serviceId', serviceIdPipe) serviceId: string,
    @Body(inputPipe) body: ServiceInput,
  ): Promise<Service> {
    return this.updateService.execute(membership, serviceId, body);
  }

  @Post(':serviceId/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @CurrentMembership() membership: MembershipSummary,
    @Param('serviceId', serviceIdPipe) serviceId: string,
  ): Promise<Service> {
    return this.setServiceActive.execute(membership, serviceId, false);
  }

  @Post(':serviceId/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @CurrentMembership() membership: MembershipSummary,
    @Param('serviceId', serviceIdPipe) serviceId: string,
  ): Promise<Service> {
    return this.setServiceActive.execute(membership, serviceId, true);
  }
}
