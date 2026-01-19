
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* TypeScript Configuration */
  typescript: {
    ignoreBuildErrors: true,
  },

  /* ESLint Configuration */
  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    // In development, Next.js needs 'unsafe-eval' for some of its features like Fast Refresh.
    const isDev = process.env.NODE_ENV === 'development';

    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://widget.cloudinary.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' blob: data: https://res.cloudinary.com https://images.unsplash.com https://placehold.co https://picsum.photos https://firebasestorage.googleapis.com https://storage.googleapis.com https://api.qrserver.com https://lh3.googleusercontent.com;
        font-src 'self' https://fonts.gstatic.com;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://vitals.vercel-insights.com https://api.cloudinary.com;
        frame-src 'self' https://widget.cloudinary.com;
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
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
};

export default nextConfig;
