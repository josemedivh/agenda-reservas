import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { ApiErrorResponse } from '@turnero/shared';
import type { Response } from 'express';
import {
  AppointmentError,
  AppointmentNotFoundError,
  AppointmentOverlapError,
} from '../domain/errors.js';

function toResponse(error: AppointmentError): ApiErrorResponse {
  if (error instanceof AppointmentNotFoundError) {
    return { statusCode: HttpStatus.NOT_FOUND, message: error.message };
  }
  if (error instanceof AppointmentOverlapError) {
    return { statusCode: HttpStatus.CONFLICT, message: error.message };
  }
  return { statusCode: HttpStatus.BAD_REQUEST, message: error.message };
}

/** Turns appointment domain errors into HTTP responses. */
@Catch(AppointmentError)
export class AppointmentErrorFilter implements ExceptionFilter<AppointmentError> {
  catch(error: AppointmentError, host: ArgumentsHost): void {
    const body = toResponse(error);
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
