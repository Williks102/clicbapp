
import type { NextConfig } from 'next';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.paiementpro.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://res.cloudinary.com https://placehold.co https://images.unsplash.com https://picsum.photos https://firebasestorage.googleapis.com https://storage.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://www.paiementpro.net vitals.vercel-insights.com *.googleapis.com;
    worker-src 'self' blob:;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  /* TypeScript Configuration */
  typescript: {
    ignoreBuildErrors: true,
  },

  /* ESLint Configuration */
  eslint: {
    ignoreDuringBuilds: true,
  },

  /* Images Configuration */
  images: {
    remotePatterns: [
      // ✅ Cloudinary (PRINCIPAL - Pour les images uploadées)
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      // Placeholder services (pour développement/design)
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      // Firebase Storage (garder pour compatibilité avec anciennes images)
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Optimisation Next.js Image
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  /* Performance */
  compress: false, // Cloudinary gère déjà la compression

  /* Security Headers */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
