import type { NextConfig } from 'next';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The browser only talks to this origin: /api/* is forwarded to the API, so the session
  // cookie belongs to the web app and server components can read it.
  rewrites() {
    return Promise.resolve([{ source: '/api/:path*', destination: `${apiUrl}/:path*` }]);
  },
};

export default nextConfig;
