'use client';

import { useEffect, useState } from 'react';
import { ApiError, requestApi } from './client';

const LOAD_ERROR = 'No pudimos cargar las horas. Inténtalo de nuevo en un momento.';

export type Loaded<T> = { path: string; data: T } | { path: string; error: string };

/**
 * GET `path` (null: nothing to ask). Returns null while the answer for this path is loading.
 * A new `version` asks the same path again (for example after a time was just taken).
 */
export function useApiGet<T>(path: string | null, version = 0): Loaded<T> | null {
  const [loaded, setLoaded] = useState<(Loaded<T> & { version: number }) | null>(null);

  useEffect(() => {
    if (path === null) {
      return undefined;
    }
    let cancelled = false;
    requestApi<T>('GET', path).then(
      (data) => {
        if (!cancelled) {
          setLoaded({ path, version, data });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setLoaded({
            path,
            version,
            error: error instanceof ApiError ? error.message : LOAD_ERROR,
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  // Ignore answers to a question that has already changed.
  return loaded?.path === path && loaded.version === version ? loaded : null;
}

/** Query string without the empty values ("any professional" is simply left out). */
export function queryString(values: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== '') {
      params.set(key, value);
    }
  }
  return params.toString();
}
