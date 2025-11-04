const nextConfig = {
  reactStrictMode: true,
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
