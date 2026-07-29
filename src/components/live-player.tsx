'use client';

import { Radio, VideoOff } from 'lucide-react';
import { Countdown } from '@/components/countdown';
import { Badge } from '@/components/ui/badge';
import { resolveEmbedUrl } from '@/lib/live-utils';
import type { LiveConfig } from '@/lib/types';

type LivePlayerProps = {
  live: LiveConfig;
  competitionTitle: string;
};

/**
 * Player de diffusion : intègre le flux de l'organisateur (YouTube, Facebook,
 * Vimeo, iframe ou HLS) et affiche l'état d'attente entre deux directs.
 */
export function LivePlayer({ live, competitionTitle }: LivePlayerProps) {
  // Hors direct, un replay disponible prend la place du flux.
  const sourceUrl = live.isLive ? live.url : live.replayUrl || '';
  const embed = sourceUrl ? resolveEmbedUrl(live.provider, sourceUrl) : null;

  if (!embed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-xl border bg-slate-950 p-6 text-center text-slate-300">
        <VideoOff className="h-10 w-10 opacity-60" />
        <div>
          <p className="font-headline text-lg font-semibold text-white">
            {live.title || competitionTitle}
          </p>
          <p className="mt-1 text-sm">
            Le direct n&apos;a pas encore commencé. Revenez à l&apos;heure annoncée.
          </p>
        </div>
        {live.scheduledAt && (
          <Countdown target={live.scheduledAt} label="Début du direct dans" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-black">
        {embed.kind === 'iframe' ? (
          <iframe
            src={embed.src}
            title={live.title || competitionTitle}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          // Flux HLS : lecture native (Safari/iOS et navigateurs compatibles).
          <video
            src={embed.src}
            className="absolute inset-0 h-full w-full"
            controls
            autoPlay
            playsInline
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {live.isLive ? (
          <Badge className="gap-1.5 bg-red-600 text-white hover:bg-red-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            EN DIRECT
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            Rediffusion
          </Badge>
        )}
        <span className="font-headline text-lg font-semibold">
          {live.title || competitionTitle}
        </span>
      </div>
    </div>
  );
}
