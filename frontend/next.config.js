/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5055';

const nextConfig = {
  output: 'standalone',   // Requis pour le Dockerfile multi-stage
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Variables d'environnement exposées au client
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },

  // Redirection des appels API via le proxy Next.js (évite les problèmes CORS en dev)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
