
import type { NextConfig } from 'next';

/**
 * Content Security Policy.
 *
 * Toute origine appelée par le navigateur doit y figurer, sinon la requête est
 * bloquée avant même d'atteindre le réseau. Les origines nécessaires :
 *  - `*.supabase.co` : API REST (connect-src) et WebSocket temps réel (wss) ;
 *  - Cloudinary : script et iframe du widget d'upload, API d'envoi ;
 *  - Paiement Pro et Orange Money : passerelle de paiement ;
 *  - YouTube, Facebook, Vimeo : lecteurs de diffusion embarqués.
 */
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.paiementpro.net https://paiementpro.net https://www.paiementpro.net https://upload-widget.cloudinary.com https://vercel.live;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://res.cloudinary.com https://placehold.co https://images.unsplash.com https://picsum.photos https://i.ytimg.com;
    font-src 'self' https://fonts.gstatic.com;
    media-src 'self' blob: https:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com https://res.cloudinary.com https://*.paiementpro.net https://paiementpro.net https://www.paiementpro.net vitals.vercel-insights.com https://clicbillet.com https://www.clicbillet.com https://mpayment.orange-money.com https://monticket.online https://*.monticket.online https://vercel.live;
    worker-src 'self' blob:;
    frame-src 'self' https://*.paiementpro.net https://paiementpro.net https://www.paiementpro.net https://upload-widget.cloudinary.com https://clicbillet.com https://www.clicbillet.com https://mpayment.orange-money.com https://monticket.online https://*.monticket.online https://vercel.live https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://www.facebook.com https://web.facebook.com https://player.vimeo.com;
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
