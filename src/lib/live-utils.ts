import type { Competition, LiveProvider } from '@/lib/types';
import { extractTikTokId } from '@/lib/live-url';

/**
 * Convertit l'URL saisie par l'organisateur en URL embarquable dans une iframe.
 * Les flux HLS (.m3u8) ne sont pas embarquables : ils sont lus par le player natif.
 */
export function resolveEmbedUrl(
  provider: LiveProvider,
  url: string
): { kind: 'iframe' | 'hls'; src: string } | null {
  if (!url) return null;

  switch (provider) {
    case 'youtube': {
      const videoId = extractYouTubeId(url);
      if (!videoId) return null;
      return {
        kind: 'iframe',
        src: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
      };
    }
    case 'facebook':
      return {
        kind: 'iframe',
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
          url
        )}&show_text=false&autoplay=true`,
      };
    case 'vimeo': {
      const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
      if (!id) return null;
      return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}?autoplay=1` };
    }
    case 'tiktok': {
      // Lecteur officiel : www.tiktok.com/player/v1/<id>
      const id = extractTikTokId(url);
      if (!id) return null;
      return {
        kind: 'iframe',
        src: `https://www.tiktok.com/player/v1/${id}?autoplay=1&description=0&music_info=0`,
      };
    }
    case 'hls':
      return { kind: 'hls', src: url };
    case 'iframe':
    default:
      return { kind: 'iframe', src: url };
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return /^[\w-]{11}$/.test(url) ? url : null;
}

/** Le direct est-il visible sans payer ? */
export function isLiveFree(competition: Pick<Competition, 'live'>) {
  return !competition.live?.paid || (competition.live?.price ?? 0) <= 0;
}

/** Le vote est-il ouvert à cet instant ? */
export function isVotingOpen(
  competition: Pick<
    Competition,
    'status' | 'votingEnabled' | 'votingStartsAt' | 'votingEndsAt'
  >
) {
  // Un événement de diffusion pure n'a ni scrutin ni fenêtre de vote.
  if (!competition.votingEnabled) return false;
  if (!competition.votingStartsAt || !competition.votingEndsAt) return false;
  if (competition.status !== 'voting') return false;

  const now = Date.now();
  const start = new Date(competition.votingStartsAt).getTime();
  const end = new Date(competition.votingEndsAt).getTime();
  return now >= start && now <= end;
}

/**
 * Statuts visibles du public. Les requêtes clientes doivent filtrer sur cette
 * liste : les règles Firestore rejettent tout listing susceptible de renvoyer
 * un concours en brouillon.
 */
export const PUBLIC_COMPETITION_STATUSES = [
  'published',
  'voting',
  'closed',
  'finished',
] as const;

export const COMPETITION_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  published: 'À venir',
  voting: 'Votes ouverts',
  closed: 'Votes clôturés',
  finished: 'Terminé',
};

/**
 * Statuts d'un événement diffusé sans scrutin.
 *
 * « Votes ouverts » et « Votes clôturés » décrivent l'état d'un vote : ils
 * n'ont pas de sens pour une retransmission, et la base les refuse. Ils
 * figurent tout de même ici pour qu'une donnée héritée reste lisible plutôt
 * que d'afficher un identifiant brut.
 */
export const LIVE_EVENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Annoncé',
  voting: 'Annoncé',
  closed: 'Terminé',
  finished: 'Terminé',
};
