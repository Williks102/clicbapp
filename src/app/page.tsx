'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, query, where } from 'firebase/firestore';
import {
  Gift,
  Radio,
  Search,
  Sparkles,
  Trophy,
  Users,
  Vote as VoteIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import CompetitionCard from '@/components/competition-card';
import { useCollection, useFirebase } from '@/firebase';
import { PUBLIC_COMPETITION_STATUSES } from '@/lib/live-utils';
import { cn, formatVotes } from '@/lib/utils';
import type { Competition } from '@/lib/types';

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: 'Choisissez un concours',
    description:
      'Miss, télé-crochets, awards, compétitions sportives : trouvez l’événement qui vous passionne.',
  },
  {
    icon: Gift,
    title: 'Votez gratuitement',
    description:
      'Un vote offert à intervalle régulier pour chaque concours, simplement en créant un compte.',
  },
  {
    icon: Sparkles,
    title: 'Boostez votre favori',
    description:
      'Achetez un pack de votes par Mobile Money ou carte bancaire pour le faire grimper au classement.',
  },
  {
    icon: Radio,
    title: 'Vivez la finale en direct',
    description:
      'Suivez la diffusion, discutez dans le chat et regardez le classement évoluer en temps réel.',
  },
];

export default function Home() {
  const { areServicesAvailable, firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');

  const competitionsQuery = useMemo(
    () =>
      areServicesAvailable && firestore
        ? query(
            collection(firestore, 'competitions'),
            where('status', 'in', [...PUBLIC_COMPETITION_STATUSES])
          )
        : null,
    [areServicesAvailable, firestore]
  );

  const { data: competitions, isLoading } = useCollection<Competition>(competitionsQuery);

  const publicCompetitions = useMemo(() => competitions ?? [], [competitions]);

  const liveNow = useMemo(
    () => publicCompetitions.filter((c) => c.live?.isLive),
    [publicCompetitions]
  );

  const categories = useMemo(() => {
    const unique = new Set(publicCompetitions.map((c) => c.category).filter(Boolean));
    return ['Tous', ...Array.from(unique).sort()];
  }, [publicCompetitions]);

  const filtered = useMemo(() => {
    let results = publicCompetitions;

    if (activeCategory !== 'Tous') {
      results = results.filter((c) => c.category === activeCategory);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter((c) => c.title?.toLowerCase().includes(term));
    }

    // Les votes ouverts d'abord, puis les concours à venir, puis les terminés.
    const weight: Record<string, number> = {
      voting: 0,
      published: 1,
      closed: 2,
      finished: 3,
    };
    return [...results].sort(
      (a, b) => (weight[a.status] ?? 9) - (weight[b.status] ?? 9)
    );
  }, [publicCompetitions, activeCategory, searchTerm]);

  const totals = useMemo(
    () =>
      publicCompetitions.reduce(
        (acc, c) => {
          acc.votes += c.stats?.totalVotes ?? 0;
          acc.candidates += c.stats?.candidatesCount ?? 0;
          return acc;
        },
        { votes: 0, candidates: 0 }
      ),
    [publicCompetitions]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainNav />

      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div className="space-y-6">
                <Badge variant="secondary" className="gap-1.5">
                  <Trophy className="h-3.5 w-3.5" />
                  Vote en ligne &amp; diffusion live
                </Badge>
                <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                  Faites gagner{' '}
                  <span className="text-primary">votre favori</span>, en direct
                </h1>
                <p className="max-w-xl text-lg text-muted-foreground">
                  La plateforme ivoirienne de vote pour les concours, télé-crochets et
                  cérémonies — avec la diffusion en direct des grands soirs.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" asChild>
                    <Link href="/competitions">
                      <VoteIcon className="mr-2 h-5 w-5" />
                      Voter maintenant
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/live">
                      <Radio className="mr-2 h-5 w-5" />
                      Voir les directs
                    </Link>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-6 pt-2 text-sm">
                  <div>
                    <p className="font-headline text-2xl font-bold text-primary">
                      {formatVotes(totals.votes)}
                    </p>
                    <p className="text-muted-foreground">votes enregistrés</p>
                  </div>
                  <div>
                    <p className="font-headline text-2xl font-bold text-primary">
                      {publicCompetitions.length}
                    </p>
                    <p className="text-muted-foreground">concours</p>
                  </div>
                  <div>
                    <p className="font-headline text-2xl font-bold text-primary">
                      {totals.candidates}
                    </p>
                    <p className="text-muted-foreground">candidats</p>
                  </div>
                </div>
              </div>

              <div className="relative hidden min-h-[320px] items-center justify-center md:flex">
                <div className="relative h-80 w-80">
                  <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10" />
                  <div className="absolute left-[8%] top-[6%] w-44 rounded-2xl border bg-card p-4 shadow-lg">
                    <VoteIcon className="h-10 w-10 text-primary" />
                    <p className="mt-2 font-bold">Votes en temps réel</p>
                    <p className="text-sm text-muted-foreground">
                      Classement mis à jour à la seconde
                    </p>
                  </div>
                  <div className="absolute bottom-[6%] right-[8%] w-44 rounded-2xl border bg-card p-4 shadow-lg">
                    <Radio className="h-10 w-10 text-primary" />
                    <p className="mt-2 font-bold">Direct HD</p>
                    <p className="text-sm text-muted-foreground">
                      Chat et votes pendant l&apos;émission
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Directs en cours ---------- */}
        {liveNow.length > 0 && (
          <section className="border-b bg-slate-950 py-10 text-slate-100">
            <div className="container mx-auto px-4">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-semibold">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  EN DIRECT
                </span>
                <h2 className="font-headline text-2xl font-bold">
                  {liveNow.length} diffusion{liveNow.length > 1 ? 's' : ''} en cours
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {liveNow.map((competition) => (
                  <Link
                    key={competition.id}
                    href={`/competitions/${competition.id}/live`}
                    className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-primary"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-600/20 text-red-400">
                      <Radio className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold group-hover:text-primary">
                        {competition.live?.title || competition.title}
                      </p>
                      <p className="truncate text-sm text-slate-400">
                        {competition.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- Concours ---------- */}
        <section id="competitions" className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8 text-center">
              <h2 className="font-headline text-3xl font-bold tracking-tight">
                Les concours du moment
              </h2>
              <p className="mt-2 text-lg text-muted-foreground">
                Soutenez votre candidat préféré, chaque vote compte.
              </p>
            </div>

            <div className="mx-auto mb-6 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher un concours…"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? 'default' : 'outline'}
                  onClick={() => setActiveCategory(category)}
                  className={cn(activeCategory === category && 'shadow-md')}
                  size="sm"
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <CompetitionCard.Skeleton key={index} />
                ))}
              {filtered.map((competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>

            {!isLoading && filtered.length === 0 && (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">
                  Aucun concours ne correspond à votre recherche.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ---------- Comment ça marche ---------- */}
        <section className="border-t bg-muted/30 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="mb-10 text-center">
              <h2 className="font-headline text-3xl font-bold tracking-tight">
                Comment ça marche ?
              </h2>
              <p className="mt-2 text-lg text-muted-foreground">
                Quatre étapes pour soutenir votre favori.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step, index) => (
                <div key={step.title} className="rounded-xl border bg-card p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    Étape {index + 1}
                  </p>
                  <h3 className="font-headline mt-1 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Organisateurs ---------- */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-background p-8 md:p-12">
              <div className="grid items-center gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <Badge variant="secondary" className="gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Vous organisez un concours ?
                  </Badge>
                  <h2 className="font-headline text-3xl font-bold tracking-tight">
                    Lancez votre compétition en quelques minutes
                  </h2>
                  <p className="text-muted-foreground">
                    Créez vos candidats, définissez vos packs de votes, diffusez la
                    finale en direct et suivez vos revenus en temps réel.
                  </p>
                  <Button size="lg" asChild>
                    <Link href="/dashboard/competitions/create">
                      Créer mon concours
                    </Link>
                  </Button>
                </div>

                <ul className="space-y-3">
                  {[
                    'Packs de votes personnalisables et paiement Mobile Money',
                    'Vote gratuit pour attirer un maximum de participants',
                    'Diffusion en direct avec chat modéré',
                    'Statistiques et reversements détaillés',
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Sparkles className="h-3 w-3" />
                      </span>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
