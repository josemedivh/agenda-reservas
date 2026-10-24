import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { ApiErrorResponse } from '@turnero/shared';
import type { Response } from 'express';
import {
  BusinessEditForbiddenError,
  BusinessError,
  BusinessNotFoundError,
  InvalidBusinessDataError,
  SlugTakenError,
} from '../domain/errors.js';

function toResponse(error: BusinessError): ApiErrorResponse {
  if (error instanceof InvalidBusinessDataError) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Revisa los datos ingresados.',
      fieldErrors: { [error.field]: [error.message] },
    };
  }
  if (error instanceof SlugTakenError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      message: error.message,
      fieldErrors: { slug: [error.message] },
      suggestion: error.suggestion,
    };
  }
  if (error instanceof BusinessEditForbiddenError) {
    return { statusCode: HttpStatus.FORBIDDEN, message: error.message };
  }
  if (error instanceof BusinessNotFoundError) {
    return { statusCode: HttpStatus.NOT_FOUND, message: error.message };
  }
  return { statusCode: HttpStatus.BAD_REQUEST, message: error.message };
}

/** Turns business domain errors into HTTP responses. */
@Catch(BusinessError)
export class BusinessErrorFilter implements ExceptionFilter<BusinessError> {
  catch(error: BusinessError, host: ArgumentsHost): void {
    const body = toResponse(error);
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
