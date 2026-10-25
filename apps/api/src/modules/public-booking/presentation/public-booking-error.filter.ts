import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { ApiErrorResponse } from '@turnero/shared';
import type { Response } from 'express';
import {
  BookingNotFoundError,
  PublicBookingError,
  TimeNotAvailableError,
} from '../domain/errors.js';

function toResponse(error: PublicBookingError): ApiErrorResponse {
  if (error instanceof BookingNotFoundError) {
    return { statusCode: HttpStatus.NOT_FOUND, message: error.message };
  }
  if (error instanceof TimeNotAvailableError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      message: error.message,
      fieldErrors: { startsAt: [error.message] },
    };
  }
  return { statusCode: HttpStatus.BAD_REQUEST, message: error.message };
}

/** Turns public booking domain errors into HTTP responses. */
@Catch(PublicBookingError)
export class PublicBookingErrorFilter implements ExceptionFilter<PublicBookingError> {
  catch(error: PublicBookingError, host: ArgumentsHost): void {
    const body = toResponse(error);
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
