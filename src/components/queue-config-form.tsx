'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { setQueueEnabled } from '@/app/actions/queue-actions';
import { QueueConfig } from '@/lib/types';
import { Loader2, Users, Clock } from 'lucide-react';

interface QueueConfigFormProps {
  eventId: string;
  initialConfig?: QueueConfig;
}

export function QueueConfigForm({ eventId, initialConfig }: QueueConfigFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false);
  const [maxConcurrentUsers, setMaxConcurrentUsers] = useState(
    initialConfig?.maxConcurrentUsers ?? 5
  );
  const [averageCheckoutTime, setAverageCheckoutTime] = useState(
    (initialConfig?.averageCheckoutTime ?? 300) / 60 // Convertir en minutes
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await setQueueEnabled(
        eventId,
        enabled,
        maxConcurrentUsers,
        averageCheckoutTime * 60 // Convertir en secondes
      );

      if (result.success) {
        toast({
          title: 'Configuration enregistrée',
          description: enabled
            ? 'La file d\'attente virtuelle est maintenant active pour cet événement.'
            : 'La file d\'attente virtuelle a été désactivée.',
        });
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Une erreur est survenue',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          File d'Attente Virtuelle
        </CardTitle>
        <CardDescription>
          Gérez l'affluence lors de l'ouverture des ventes avec un système de file d'attente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Activer/Désactiver */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="queue-enabled">Activer la file d'attente</Label>
              <p className="text-sm text-muted-foreground">
                Limite le nombre d'utilisateurs en checkout simultanément
              </p>
            </div>
            <Switch
              id="queue-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <>
              {/* Nombre max d'utilisateurs */}
              <div className="space-y-2">
                <Label htmlFor="max-users">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Nombre max d'utilisateurs en checkout
                  </div>
                </Label>
                <Input
                  id="max-users"
                  type="number"
                  min={1}
                  max={50}
                  value={maxConcurrentUsers}
                  onChange={(e) => setMaxConcurrentUsers(parseInt(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nombre maximum d'utilisateurs qui peuvent acheter des billets en même temps
                </p>
              </div>

              {/* Temps moyen de checkout */}
              <div className="space-y-2">
                <Label htmlFor="checkout-time">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Temps moyen de checkout (minutes)
                  </div>
                </Label>
                <Input
                  id="checkout-time"
                  type="number"
                  min={1}
                  max={30}
                  value={averageCheckoutTime}
                  onChange={(e) => setAverageCheckoutTime(parseInt(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Temps estimé pour qu'un utilisateur complète son achat (utilisé pour calculer le temps d'attente)
                </p>
              </div>

              {/* Info Box */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Comment ça fonctionne ?</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Les utilisateurs entrent dans une file d'attente virtuelle</li>
                  <li>• Un chronomètre affiche leur temps d'attente</li>
                  <li>• Ils voient leur position et le temps estimé</li>
                  <li>• Ils sont automatiquement redirigés quand c'est leur tour</li>
                  <li>• Cela évite la surcharge du serveur pendant les pics</li>
                </ul>
              </div>
            </>
          )}

          {/* Bouton de sauvegarde */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer la configuration
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
