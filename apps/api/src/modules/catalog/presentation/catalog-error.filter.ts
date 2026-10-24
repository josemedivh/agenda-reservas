import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { ApiErrorResponse } from '@turnero/shared';
import type { Response } from 'express';
import {
  CatalogEditForbiddenError,
  CatalogError,
  InvalidCatalogDataError,
  ProfessionalLimitReachedError,
  ProfessionalNameTakenError,
  ProfessionalNotFoundError,
} from '../domain/errors.js';

function toResponse(error: CatalogError): ApiErrorResponse {
  if (error instanceof InvalidCatalogDataError) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Revisa los datos ingresados.',
      fieldErrors: { [error.field]: [error.message] },
    };
  }
  if (error instanceof ProfessionalNameTakenError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      message: error.message,
      fieldErrors: { name: [error.message] },
    };
  }
  if (error instanceof ProfessionalLimitReachedError) {
    return { statusCode: HttpStatus.CONFLICT, message: error.message };
  }
  if (error instanceof CatalogEditForbiddenError) {
    return { statusCode: HttpStatus.FORBIDDEN, message: error.message };
  }
  if (error instanceof ProfessionalNotFoundError) {
    return { statusCode: HttpStatus.NOT_FOUND, message: error.message };
  }
  return { statusCode: HttpStatus.BAD_REQUEST, message: error.message };
}

/** Turns catalog domain errors into HTTP responses. */
@Catch(CatalogError)
export class CatalogErrorFilter implements ExceptionFilter<CatalogError> {
  catch(error: CatalogError, host: ArgumentsHost): void {
    const body = toResponse(error);
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
