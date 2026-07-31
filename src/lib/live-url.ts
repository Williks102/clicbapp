import type { LiveProvider } from '@/lib/types';

/**
 * Validation des URL de diffusion saisies par les organisateurs.
 *
 * Deux raisons de contrôler à la saisie plutôt qu'à l'affichage :
 *
 *  1. **Sécurité** — l'URL finit dans le `src` d'une iframe. Sans contrôle,
 *     un organisateur peut y placer n'importe quelle page, y compris
 *     `javascript:` ou un `data:` porteur de script.
 *  2. **Exploitation** — la Content Security Policy n'autorise dans
 *     `frame-src` qu'une liste d'hôtes précise. Une URL hors de cette liste
 *     est silencieusement bloquée par le navigateur : l'organisateur voit un
 *     cadre vide le soir de sa finale, sans message d'erreur.
 *
 * La liste ci-dessous doit rester alignée sur `frame-src` dans
 * `next.config.ts` : y ajouter un hôte sans l'ajouter à la CSP produirait une
 * URL acceptée puis bloquée à l'affichage.
 */

const ALLOWED_HOSTS: Record<Exclude<LiveProvider, 'hls'>, readonly string[]> = {
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'web.facebook.com', 'fb.watch'],
  vimeo: ['vimeo.com', 'player.vimeo.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'],
  // Le mode « iframe » sert les diffusions hébergées ailleurs, mais reste borné
  // aux hôtes que la CSP laisse passer.
  iframe: [
    'youtube.com',
    'www.youtube.com',
    'www.youtube-nocookie.com',
    'facebook.com',
    'www.facebook.com',
    'web.facebook.com',
    'player.vimeo.com',
    'www.tiktok.com',
  ],
};

export type LiveUrlCheck = { ok: true } | { ok: false; error: string };

const PROVIDER_LABELS: Record<LiveProvider, string> = {
  youtube: 'YouTube Live',
  facebook: 'Facebook Live',
  vimeo: 'Vimeo',
  tiktok: 'TikTok',
  hls: 'Flux HLS',
  iframe: 'Autre',
};

/** À quelle plateforme cet hôte appartient-il ? */
function detectProvider(host: string): Exclude<LiveProvider, 'hls' | 'iframe'> | null {
  for (const candidate of ['youtube', 'facebook', 'vimeo', 'tiktok'] as const) {
    if (ALLOWED_HOSTS[candidate].includes(host)) return candidate;
  }
  return null;
}

/**
 * Vérifie qu'une URL est diffusable par le fournisseur choisi.
 *
 * Une URL vide est acceptée : un concours peut être créé avant que le lien du
 * direct ne soit connu. C'est le lancement de l'antenne qui exige une URL,
 * contrôle porté par `setLiveStatus`.
 */
export function checkLiveUrl(provider: LiveProvider, rawUrl: string): LiveUrlCheck {
  const url = rawUrl.trim();
  if (!url) return { ok: true };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      ok: false,
      error: "L'adresse du direct est invalide. Elle doit commencer par https://.",
    };
  }

  // HTTPS uniquement : `javascript:`, `data:` et `http:` sont écartés d'un
  // coup. Le site étant servi en HTTPS, un flux en clair serait de toute façon
  // bloqué comme contenu mixte.
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: "L'adresse du direct doit être en https://." };
  }

  const host = parsed.hostname.toLowerCase();

  if (provider === 'hls') {
    if (!parsed.pathname.toLowerCase().endsWith('.m3u8')) {
      return {
        ok: false,
        error: 'Un flux HLS doit pointer vers un fichier .m3u8.',
      };
    }
    return { ok: true };
  }

  if (!ALLOWED_HOSTS[provider].includes(host)) {
    /*
     * YouTube étant la plateforme par défaut, l'erreur la plus fréquente est
     * de coller une adresse d'une autre plateforme sans changer le sélecteur.
     * Le message le dit plutôt que d'énumérer des domaines.
     */
    const actual = detectProvider(host);
    if (actual && actual !== provider) {
      return {
        ok: false,
        error: `Cette adresse est un lien ${PROVIDER_LABELS[actual]} : sélectionnez « ${PROVIDER_LABELS[actual]} » dans le champ Plateforme.`,
      };
    }

    return {
      ok: false,
      error: `Le domaine « ${host} » n'est pas diffusable. Plateformes acceptées : YouTube, Facebook et Vimeo. Pour toute autre source, utilisez un flux HLS (.m3u8).`,
    };
  }

  // Au-delà de l'hôte, l'identifiant de la vidéo doit être extractible : sans
  // lui, `resolveEmbedUrl` renvoie `null` et le lecteur reste vide.
  if (provider === 'youtube' && !hasYouTubeId(url)) {
    return {
      ok: false,
      error: "Aucun identifiant de vidéo YouTube n'a été trouvé dans cette adresse.",
    };
  }

  /*
   * TikTok n'expose pas d'iframe pour les directs : son lecteur intégré ne
   * sert que les publications. Une adresse `/live` serait acceptée puis
   * afficherait un cadre vide — autant le dire à la saisie.
   */
  if (provider === 'tiktok') {
    if (/\/live\/?($|\?)/.test(parsed.pathname + parsed.search)) {
      return {
        ok: false,
        error:
          "TikTok ne permet pas d'intégrer un direct sur un autre site. Diffusez la vidéo TikTok une fois publiée, ou utilisez un flux HLS pour le direct.",
      };
    }
    if (!extractTikTokId(url)) {
      return {
        ok: false,
        error:
          "Aucun identifiant de publication TikTok n'a été trouvé. L'adresse doit ressembler à https://www.tiktok.com/@compte/video/1234567890.",
      };
    }
    return { ok: true };
  }

  if (provider === 'vimeo' && !/vimeo\.com\/(?:video\/)?\d+/.test(url)) {
    return {
      ok: false,
      error: "Aucun identifiant de vidéo Vimeo n'a été trouvé dans cette adresse.",
    };
  }

  return { ok: true };
}

/** Identifiant numérique d'une publication TikTok. */
export function extractTikTokId(url: string): string | null {
  return url.match(/tiktok\.com\/(?:@[\w.-]+\/)?(?:video|player\/v1)\/(\d{6,})/)?.[1] ?? null;
}

/** Reprend les formes d'URL reconnues par `resolveEmbedUrl`. */
function hasYouTubeId(url: string): boolean {
  return [
    /youtube\.com\/watch\?v=[\w-]{11}/,
    /youtu\.be\/[\w-]{11}/,
    /youtube\.com\/live\/[\w-]{11}/,
    /youtube\.com\/embed\/[\w-]{11}/,
  ].some((pattern) => pattern.test(url));
}
