import type { NextConfig } from 'next';

/**
 * Content Security Policy.
 *
 * Toute origine appelée par le navigateur doit y figurer, sinon la requête est
 * bloquée avant même d'atteindre le réseau. Les origines nécessaires :
 *  - `*.supabase.co` : API REST (connect-src) et WebSocket temps réel (wss) ;
 *  - Cloudinary : script et iframe du widget d'upload, API d'envoi ;
 *  - Paystack : page de paiement hébergée, atteinte par redirection ;
 *  - YouTube, Facebook, Vimeo : lecteurs de diffusion embarqués.
 */
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://upload-widget.cloudinary.com https://vercel.live;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://res.cloudinary.com https://placehold.co https://images.unsplash.com https://picsum.photos https://i.ytimg.com;
    font-src 'self' https://fonts.gstatic.com;
    media-src 'self' blob: https:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com https://res.cloudinary.com vitals.vercel-insights.com https://vercel.live;
    worker-src 'self' blob:;
    frame-src 'self' https://checkout.paystack.com https://upload-widget.cloudinary.com https://vercel.live https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://www.facebook.com https://web.facebook.com https://player.vimeo.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://checkout.paystack.com;
    frame-ancestors 'self';
    upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  /* TypeScript : une erreur de type doit bloquer le déploiement. */
  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      // Cloudinary héberge les visuels des concours et des candidats.
      { protocol: 'https', hostname: 'res.cloudinary.com', port: '', pathname: '/**' },
      // Services d'images de substitution, utilisés par défaut et en développement.
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  /* Cloudinary sert déjà les images compressées. */
  compress: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
          // Empêche le navigateur de deviner un type MIME différent de celui annoncé.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
