'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, Pencil, Radio, Settings2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type CompetitionTabsProps = {
  competitionId: string;
  liveEnabled?: boolean;
};

export function CompetitionTabs({ competitionId, liveEnabled }: CompetitionTabsProps) {
  const pathname = usePathname();
  const base = `/dashboard/competitions/${competitionId}`;

  const tabs = [
    { href: base, label: 'Vue d’ensemble', icon: Settings2 },
    { href: `${base}/candidates`, label: 'Candidats', icon: Users },
    { href: `${base}/edit`, label: 'Réglages', icon: Pencil },
    ...(liveEnabled ? [{ href: `${base}/live`, label: 'Régie du direct', icon: Radio }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            pathname === tab.href
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </Link>
      ))}

      <Button variant="ghost" size="sm" className="ml-auto" asChild>
        <Link href={`/competitions/${competitionId}`} target="_blank">
          <ExternalLink className="mr-2 h-4 w-4" />
          Page publique
        </Link>
      </Button>
    </div>
  );
}
