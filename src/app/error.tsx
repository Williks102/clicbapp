'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * Frontière d'erreur de l'application.
 * Affiche le message réel plutôt que l'écran générique de Next.js, afin qu'une
 * exception côté client reste diagnosticable en production.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App] ❌ Exception côté client :', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="font-headline text-2xl">
            Une erreur est survenue
          </CardTitle>
          <CardDescription>
            La page n&apos;a pas pu s&apos;afficher correctement.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">Détail technique</p>
            <p className="mt-1 break-words font-mono text-xs text-muted-foreground">
              {error.message || 'Erreur inconnue'}
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Référence : {error.digest}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Si le problème persiste, communiquez la référence ci-dessus au
            support. La console du navigateur contient le diagnostic complet.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset} className="w-full sm:w-auto">
            <RotateCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Retour à l&apos;accueil
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
