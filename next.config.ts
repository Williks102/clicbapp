
import type { NextConfig } from 'next';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.paiementpro.net https://paiementpro.net https://www.paiementpro.net https://apis.google.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://res.cloudinary.com https://placehold.co https://images.unsplash.com https://picsum.photos https://firebasestorage.googleapis.com https://storage.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.paiementpro.net https://paiementpro.net https://www.paiementpro.net vitals.vercel-insights.com *.googleapis.com https://*.cloudworkstations.dev wss: https://clicbillet.com https://www.clicbillet.com https://mpayment.orange-money.com https://monticket.online https://*.monticket.online;
    worker-src 'self' blob:;
    frame-src 'self' https://*.paiementpro.net https://paiementpro.net https://www.paiementpro.net https://clicbillet.com https://www.clicbillet.com https://mpayment.orange-money.com https://monticket.online https://*.monticket.online;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://clicbillet.com https://www.clicbillet.com https://*.paiementpro.net https://paiementpro.net https://mpayment.orange-money.com https://monticket.online https://*.monticket.online;
    frame-ancestors *;
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
        source: '/(.*)',
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
