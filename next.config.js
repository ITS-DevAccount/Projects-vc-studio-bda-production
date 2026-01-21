const nextConfig = {
  reactStrictMode: true,
  // Disable Fast Refresh to prevent removeChild errors during route transitions
  // This is a workaround for Next.js 16/Turbopack issue
  experimental: {
    // Try to stabilize Fast Refresh behavior
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Allow iframes for all pages
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Allow same-origin iframes
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'", // Allow same-origin iframes in CSP
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
