import { vi } from 'vitest';

// Shared by the auth form specs.

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function stubFetch() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function jsonBody(init: RequestInit | undefined): unknown {
  return JSON.parse(typeof init?.body === 'string' ? init.body : 'null');
}

export function sentJson(fetchMock: ReturnType<typeof stubFetch>): unknown {
  return jsonBody(fetchMock.mock.calls[0]?.[1]);
}

export function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}
