import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { ApiErrorResponse } from '@turnero/shared';
import type { Response } from 'express';
import {
  InvalidScheduleDataError,
  ScheduleEditForbiddenError,
  ScheduleError,
  UnknownProfessionalError,
} from '../domain/errors.js';

function toResponse(error: ScheduleError): ApiErrorResponse {
  if (error instanceof InvalidScheduleDataError) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Revisa los horarios.',
      fieldErrors: { [error.field]: [error.message] },
    };
  }
  if (error instanceof ScheduleEditForbiddenError) {
    return { statusCode: HttpStatus.FORBIDDEN, message: error.message };
  }
  if (error instanceof UnknownProfessionalError) {
    return { statusCode: HttpStatus.NOT_FOUND, message: error.message };
  }
  return { statusCode: HttpStatus.BAD_REQUEST, message: error.message };
}

/** Turns schedule domain errors into HTTP responses. */
@Catch(ScheduleError)
export class ScheduleErrorFilter implements ExceptionFilter<ScheduleError> {
  catch(error: ScheduleError, host: ArgumentsHost): void {
    const body = toResponse(error);
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
