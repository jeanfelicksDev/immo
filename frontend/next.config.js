/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone',   // Requis pour le Dockerfile multi-stage
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Note : pas de rewrites — les routes API Next.js (frontend/src/app/api/*)
  // gèrent directement toutes les requêtes /api/* en se connectant à Neon PostgreSQL.
  // NEXT_PUBLIC_API_URL est vide ici pour éviter de rediriger vers 127.0.0.1 depuis Vercel.
};

module.exports = nextConfig;
