'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlayCircle, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { setLiveStatus } from '@/app/actions/live-actions';

type LiveStatusToggleProps = {
  competitionId: string;
  isLive: boolean;
  isEnabled: boolean;
};

export function LiveStatusToggle({
  competitionId,
  isLive,
  isEnabled,
}: LiveStatusToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  if (!isEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Activez la diffusion dans les réglages du concours pour piloter le direct.
      </p>
    );
  }

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const result = await setLiveStatus(competitionId, !isLive);

      if (result.success) {
        toast({ title: 'Statut mis à jour', description: result.message });
        router.refresh();
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button
        onClick={handleToggle}
        disabled={isLoading}
        variant={isLive ? 'destructive' : 'default'}
        size="lg"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isLive ? (
          <StopCircle className="mr-2 h-4 w-4" />
        ) : (
          <PlayCircle className="mr-2 h-4 w-4" />
        )}
        {isLive ? 'Arrêter le direct' : 'Lancer le direct'}
      </Button>

      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            isLive ? 'animate-pulse bg-red-500' : 'bg-muted-foreground/40'
          }`}
        />
        <span className="text-sm font-medium">
          {isLive ? 'En direct' : 'Hors ligne'}
        </span>
      </div>
    </div>
  );
}
