import type { ApiErrorResponse } from '@turnero/shared';

const UNEXPECTED_ERROR = 'Algo salió mal. Inténtalo de nuevo en un momento.';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: ApiErrorResponse['fieldErrors'] = {},
    readonly suggestion: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiErrorResponse>;
    return new ApiError(
      response.status,
      body.message ?? UNEXPECTED_ERROR,
      body.fieldErrors,
      body.suggestion ?? null,
    );
  } catch {
    return new ApiError(response.status, UNEXPECTED_ERROR);
  }
}

/**
 * Calls the API through the web app's /api rewrite (same origin, so the session cookie is
 * sent and stored automatically). Throws ApiError on non-2xx responses.
 */
export async function requestApi<T = undefined>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw await readError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function postToApi<T = undefined>(path: string, body?: unknown): Promise<T> {
  return requestApi<T>('POST', path, body);
}
