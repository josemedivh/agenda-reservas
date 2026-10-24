import type { ApiErrorResponse } from '@turnero/shared';

const UNEXPECTED_ERROR = 'Algo salió mal. Inténtalo de nuevo en un momento.';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: ApiErrorResponse['fieldErrors'] = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiErrorResponse>;
    return new ApiError(response.status, body.message ?? UNEXPECTED_ERROR, body.fieldErrors);
  } catch {
    return new ApiError(response.status, UNEXPECTED_ERROR);
  }
}

/**
 * POSTs JSON to the API through the web app's /api rewrite (same origin, so the session
 * cookie is sent and stored automatically). Throws ApiError on non-2xx responses.
 */
export async function postToApi<T = undefined>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) {
    throw await readError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
