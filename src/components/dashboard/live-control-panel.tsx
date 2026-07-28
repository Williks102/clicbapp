'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eraser, Link2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { updateLiveUrl } from '@/app/actions/live-actions';
import { clearChat } from '@/app/actions/chat-actions';

type LiveControlPanelProps = {
  competitionId: string;
  currentUrl: string;
  chatEnabled: boolean;
};

/** Réglages rapides accessibles pendant la diffusion. */
export function LiveControlPanel({
  competitionId,
  currentUrl,
  chatEnabled,
}: LiveControlPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [url, setUrl] = useState(currentUrl);
  const [isPending, startTransition] = useTransition();

  const handleSaveUrl = () => {
    startTransition(async () => {
      const result = await updateLiveUrl(competitionId, url.trim());
      toast({
        title: result.success ? 'URL mise à jour' : 'Erreur',
        description: result.success ? result.message : result.error,
        variant: result.success ? undefined : 'destructive',
      });
      if (result.success) router.refresh();
    });
  };

  const handleClearChat = () => {
    startTransition(async () => {
      const result = await clearChat(competitionId);
      toast({
        title: result.success ? 'Chat vidé' : 'Erreur',
        description: result.success ? result.message : result.error,
        variant: result.success ? undefined : 'destructive',
      });
      if (result.success) router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="live-url">URL du flux en cours</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="live-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
          <Button
            onClick={handleSaveUrl}
            disabled={isPending || url.trim() === currentUrl}
            className="shrink-0"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            Mettre à jour
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Changez de flux sans interrompre la page : les spectateurs verront la
          nouvelle source au prochain rafraîchissement.
        </p>
      </div>

      {chatEnabled && (
        <div className="rounded-lg border p-4">
          <p className="font-medium">Modération du chat</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vider le chat supprime définitivement tous les messages de ce direct.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-3" disabled={isPending}>
                <Eraser className="mr-2 h-4 w-4" />
                Vider le chat
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Vider le chat de ce direct ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tous les messages seront supprimés. Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearChat}>
                  Vider le chat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
