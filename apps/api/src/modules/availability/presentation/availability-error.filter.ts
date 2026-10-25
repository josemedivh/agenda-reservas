import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { ApiErrorResponse } from '@turnero/shared';
import type { Response } from 'express';
import {
  AvailabilityError,
  ProfessionalNotForServiceError,
  ServiceNotBookableError,
} from '../domain/errors.js';

function toResponse(error: AvailabilityError): ApiErrorResponse {
  if (error instanceof ServiceNotBookableError) {
    return { statusCode: HttpStatus.NOT_FOUND, message: error.message };
  }
  if (error instanceof ProfessionalNotForServiceError) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: error.message,
      fieldErrors: { professionalId: [error.message] },
    };
  }
  return { statusCode: HttpStatus.BAD_REQUEST, message: error.message };
}

/** Turns availability domain errors into HTTP responses. */
@Catch(AvailabilityError)
export class AvailabilityErrorFilter implements ExceptionFilter<AvailabilityError> {
  catch(error: AvailabilityError, host: ArgumentsHost): void {
    const body = toResponse(error);
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
