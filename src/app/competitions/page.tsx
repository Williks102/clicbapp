'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import CompetitionCard from '@/components/competition-card';
import { DataError } from '@/components/data-error';
import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { toCompetition } from '@/lib/supabase/mappers';
import { PUBLIC_COMPETITION_COLUMNS, type CompetitionRow } from '@/lib/supabase/types';
import {
  COMPETITION_STATUS_LABELS,
  PUBLIC_COMPETITION_STATUSES,
} from '@/lib/live-utils';
import type { Competition, CompetitionStatus } from '@/lib/types';

const STATUS_FILTERS: Array<{ value: 'all' | CompetitionStatus; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'voting', label: COMPETITION_STATUS_LABELS.voting },
  { value: 'published', label: COMPETITION_STATUS_LABELS.published },
  { value: 'closed', label: COMPETITION_STATUS_LABELS.closed },
  { value: 'finished', label: COMPETITION_STATUS_LABELS.finished },
];

export default function CompetitionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'all' | CompetitionStatus>('all');
  const [category, setCategory] = useState('Tous');

  const { data: competitions, isLoading, error } = useRealtimeQuery<
    CompetitionRow,
    Competition
  >({
    table: 'competitions',
    select: PUBLIC_COMPETITION_COLUMNS,
    inFilter: { column: 'status', values: PUBLIC_COMPETITION_STATUSES },
    orderBy: { column: 'created_at', ascending: false },
    map: toCompetition,
  });

  const publicCompetitions = useMemo(() => competitions ?? [], [competitions]);

  const categories = useMemo(() => {
    const unique = new Set(publicCompetitions.map((c) => c.category).filter(Boolean));
    return ['Tous', ...Array.from(unique).sort()];
  }, [publicCompetitions]);

  const filtered = useMemo(() => {
    let results = publicCompetitions;

    if (status !== 'all') results = results.filter((c) => c.status === status);
    if (category !== 'Tous') results = results.filter((c) => c.category === category);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (c) =>
          c.title?.toLowerCase().includes(term) ||
          c.description?.toLowerCase().includes(term)
      );
    }

    return results;
  }, [publicCompetitions, status, category, searchTerm]);

  return (
    <div className="container mx-auto px-4 py-10">
      <PageHeader
        title="Tous les concours"
        description="Parcourez les compétitions ouvertes au vote et soutenez votre favori."
      />

      <div className="mt-8 space-y-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher un concours…"
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              size="sm"
              variant={status === filter.value ? 'default' : 'outline'}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={category === item ? 'secondary' : 'ghost'}
                onClick={() => setCategory(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, index) => (
            <CompetitionCard.Skeleton key={index} />
          ))}
        {filtered.map((competition) => (
          <CompetitionCard key={competition.id} competition={competition} />
        ))}
      </div>

      <DataError error={error} subject="les concours" className="mt-8" />

      {!isLoading && !error && filtered.length === 0 && (
        <div className="mt-8 flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground">
            Aucun concours ne correspond à ces filtres.
          </p>
        </div>
      )}
    </div>
  );
}
