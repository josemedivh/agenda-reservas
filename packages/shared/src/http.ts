/** Cookie that carries the session token; the web app checks for it to protect pages. */
export const SESSION_COOKIE_NAME = 'turnero_session';

/** Body of every error response from the API. */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  /** Present on validation errors (400): messages per field. */
  fieldErrors?: Partial<Record<string, string[]>>;
  /** Present when a public link is taken (409): a free alternative, if one was found. */
  suggestion?: string | null;
}
