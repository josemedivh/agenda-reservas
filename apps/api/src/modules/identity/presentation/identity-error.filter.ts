import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import {
  BusinessAccessDeniedError,
  EmailAlreadyRegisteredError,
  IdentityError,
  InvalidCredentialsError,
  NotAuthenticatedError,
} from '../domain/errors.js';

function statusFor(error: IdentityError): HttpStatus {
  if (error instanceof EmailAlreadyRegisteredError) {
    return HttpStatus.CONFLICT;
  }
  if (error instanceof InvalidCredentialsError || error instanceof NotAuthenticatedError) {
    return HttpStatus.UNAUTHORIZED;
  }
  if (error instanceof BusinessAccessDeniedError) {
    return HttpStatus.FORBIDDEN;
  }
  return HttpStatus.BAD_REQUEST;
}

/** Turns identity domain errors (thrown by use cases or guards) into HTTP responses. */
@Catch(IdentityError)
export class IdentityErrorFilter implements ExceptionFilter<IdentityError> {
  catch(error: IdentityError, host: ArgumentsHost): void {
    const status = statusFor(error);
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      message: error.message,
    });
  }
}
