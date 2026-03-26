/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.retailerp.com' },
      { protocol: 'https', hostname: 'cdn.retailerp.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://cdn.retailerp.com",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? ''} wss: ws:`,
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // Dev-only API rewrites (prod uses Nginx/ALB)
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
