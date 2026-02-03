
'use client';

import { useState } from 'react';
import { setLiveStatus } from '@/app/actions/event-actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlayCircle, StopCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LiveStatusToggleProps {
  eventId: string;
  isLive: boolean;
  isEnabled: boolean;
}

export function LiveStatusToggle({ eventId, isLive, isEnabled }: LiveStatusToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  if (!isEnabled) {
    return (
        <p className="text-sm text-muted-foreground">
            Activez le streaming dans les options de l'événement pour contrôler le direct.
        </p>
    );
  }

  const handleToggle = async () => {
    setIsLoading(true);
    const newStatus = !isLive;
    try {
      const result = await setLiveStatus(eventId, newStatus);
      if (result.success) {
        toast({
          title: 'Statut mis à jour',
          description: `Le direct est maintenant ${newStatus ? 'en ligne' : 'hors ligne'}.`,
        });
        router.refresh(); // Refresh data on the page
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Une erreur est survenue.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
        <Button onClick={handleToggle} disabled={isLoading} variant={isLive ? 'destructive' : 'default'}>
            {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isLive ? (
                <StopCircle className="mr-2 h-4 w-4" />
            ) : (
                <PlayCircle className="mr-2 h-4 w-4" />
            )}
            {isLive ? 'Arrêter le Direct' : 'Lancer le Direct'}
        </Button>
        <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium">{isLive ? 'En Direct' : 'Hors Ligne'}</span>
        </div>
    </div>
  );
}
