import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Read at build time: the rewrite below is fixed in the build (see apps/web/Dockerfile).
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

// Sent with every page. No full Content-Security-Policy yet: Next's inline scripts would need
// nonces; framing is blocked with frame-ancestors instead.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // A self-contained server for the Docker image; tracing starts at the monorepo root so the
  // shared package and pnpm's linked dependencies are included.
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: securityHeaders }]);
  },
  // The browser only talks to this origin: /api/* is forwarded to the API, so the session
  // cookie belongs to the web app and server components can read it.
  rewrites() {
    return Promise.resolve([{ source: '/api/:path*', destination: `${apiUrl}/:path*` }]);
  },
};

export default nextConfig;
