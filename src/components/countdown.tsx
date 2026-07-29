'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type CountdownProps = {
  /** Date cible au format ISO. */
  target: string;
  label?: string;
  className?: string;
  onComplete?: () => void;
};

function diff(target: string) {
  const remaining = new Date(target).getTime() - Date.now();
  if (Number.isNaN(remaining) || remaining <= 0) return null;

  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1000),
  };
}

export function Countdown({ target, label, className, onComplete }: CountdownProps) {
  // Rendu serveur neutre : le compte à rebours démarre après l'hydratation.
  const [remaining, setRemaining] = useState<ReturnType<typeof diff>>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRemaining(diff(target));

    const interval = setInterval(() => {
      const next = diff(target);
      setRemaining(next);
      if (!next) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [target, onComplete]);

  if (!mounted) {
    return <div className={cn('h-16', className)} aria-hidden />;
  }

  if (!remaining) {
    return (
      <p className={cn('text-sm font-medium text-muted-foreground', className)}>
        Le délai est écoulé.
      </p>
    );
  }

  const units = [
    { value: remaining.days, label: 'jours' },
    { value: remaining.hours, label: 'heures' },
    { value: remaining.minutes, label: 'min' },
    { value: remaining.seconds, label: 'sec' },
  ];

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      )}
      <div className="flex gap-2">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="flex min-w-[64px] flex-col items-center rounded-lg border bg-card px-3 py-2"
          >
            <span className="font-headline text-2xl font-bold tabular-nums">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="text-xs uppercase text-muted-foreground">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
