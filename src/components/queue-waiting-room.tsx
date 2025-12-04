'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Timer, CheckCircle2 } from 'lucide-react';
import { QueueState } from '@/lib/types';

interface QueueWaitingRoomProps {
  queueState: QueueState;
  onCancel: () => void;
  onProceed?: () => void;
}

export function QueueWaitingRoom({ queueState, onCancel, onProceed }: QueueWaitingRoomProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Chronomètre - temps écoulé depuis l'entrée dans la file
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - queueState.joinedAt.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [queueState.joinedAt]);

  // Animation quand l'utilisateur devient actif
  useEffect(() => {
    if (queueState.status === 'active') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      // Appeler automatiquement onProceed après 2 secondes
      if (onProceed) {
        setTimeout(() => {
          onProceed();
        }, 2000);
      }
    }
  }, [queueState.status, onProceed]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatEstimatedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} secondes`;
    const mins = Math.ceil(seconds / 60);
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  };

  // Calculer la progression
  const progress = queueState.totalInQueue > 0
    ? ((queueState.totalInQueue - queueState.position) / queueState.totalInQueue) * 100
    : 0;

  if (queueState.status === 'active') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <Card className="w-full max-w-md border-primary shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 animate-bounce">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              C'est votre tour !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-lg text-muted-foreground">
              Vous allez être redirigé vers le formulaire d'achat...
            </p>
            {showConfetti && (
              <div className="text-4xl animate-pulse">🎉 🎊 ✨</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Salle d'Attente Virtuelle
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Merci de patienter, vous serez bientôt redirigé vers le formulaire d'achat
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Position dans la file */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Votre position</span>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {queueState.position} / {queueState.totalInQueue}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {queueState.position === 1
                ? "Vous êtes le prochain !"
                : `${queueState.position - 1} personne${queueState.position - 1 > 1 ? 's' : ''} devant vous`
              }
            </p>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 gap-4">
            {/* Temps écoulé */}
            <Card className="bg-secondary/50">
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <Clock className="h-6 w-6 text-primary mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Temps écoulé</p>
                <p className="text-2xl font-bold font-mono tabular-nums">
                  {formatTime(elapsedTime)}
                </p>
              </CardContent>
            </Card>

            {/* Temps estimé */}
            <Card className="bg-secondary/50">
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <Timer className="h-6 w-6 text-primary mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Temps estimé</p>
                <p className="text-lg font-bold text-center">
                  {queueState.estimatedWaitTime > 0
                    ? formatEstimatedTime(queueState.estimatedWaitTime)
                    : "Bientôt..."
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Messages d'information */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Pendant votre attente :</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4">
              <li>• Ne fermez pas cette page</li>
              <li>• Vous serez automatiquement redirigé</li>
              <li>• Votre place est garantie</li>
            </ul>
          </div>

          {/* Animations de chargement */}
          <div className="flex justify-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
          </div>

          {/* Bouton annuler */}
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full"
          >
            Quitter la file d'attente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
