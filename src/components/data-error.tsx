'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type DataErrorProps = {
  error: Error | null;
  /** Ce que l'utilisateur essayait de consulter, ex. « les concours ». */
  subject: string;
  className?: string;
};

/**
 * Message affiché lorsqu'une lecture Firestore échoue.
 * Le détail technique n'est visible qu'en développement ; en production, la
 * console du navigateur conserve le diagnostic complet.
 */
export function DataError({ error, subject, className }: DataErrorProps) {
  if (!error) return null;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center',
        className
      )}
    >
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <p className="font-medium">Impossible de charger {subject}.</p>
      <p className="text-sm text-muted-foreground">
        Rafraîchissez la page. Si le problème persiste, contactez le support.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <p className="mt-1 break-words font-mono text-xs text-muted-foreground">
          {error.message}
        </p>
      )}
    </div>
  );
}
