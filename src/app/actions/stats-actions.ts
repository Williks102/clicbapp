'use server';

import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { toOrder } from '@/lib/supabase/mappers';
import type { OrderRow } from '@/lib/supabase/types';
import type { AdminStats, OrganizerStats } from '@/lib/types';

const EMPTY_STATS: AdminStats = {
  totalCompetitions: 0,
  totalCandidates: 0,
  totalVotes: 0,
  paidVotes: 0,
  freeVotes: 0,
  totalRevenue: 0,
  liveAccessSold: 0,
  votesByMonth: [],
  topCompetitions: [],
  recentOrders: [],
  totalOrganizers: 0,
  totalCustomers: 0,
  topOrganizers: [],
};

/** Forme brute renvoyée par la fonction PostgreSQL `dashboard_stats`. */
type StatsPayload = Omit<AdminStats, 'votesByMonth' | 'recentOrders'> & {
  votesByMonth: Array<{ month: string; votes: number | string; revenue: number | string }>;
  recentOrders: OrderRow[];
};

function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value) || 0;
}

/** « 2026-07 » → « juil. 26 ». */
function formatMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split('-').map(Number);
  if (!year || !month) return isoMonth;

  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'short',
    year: '2-digit',
  });
}

function normalize(payload: StatsPayload): AdminStats {
  return {
    totalCompetitions: num(payload.totalCompetitions),
    totalCandidates: num(payload.totalCandidates),
    totalVotes: num(payload.totalVotes),
    paidVotes: num(payload.paidVotes),
    freeVotes: num(payload.freeVotes),
    totalRevenue: num(payload.totalRevenue),
    liveAccessSold: num(payload.liveAccessSold),
    totalOrganizers: num(payload.totalOrganizers),
    totalCustomers: num(payload.totalCustomers),
    votesByMonth: (payload.votesByMonth ?? []).map((entry) => ({
      month: formatMonth(entry.month),
      votes: num(entry.votes),
      revenue: num(entry.revenue),
    })),
    topCompetitions: (payload.topCompetitions ?? []).map((entry) => ({
      ...entry,
      votes: num(entry.votes),
      revenue: num(entry.revenue),
    })),
    topOrganizers: (payload.topOrganizers ?? []).map((entry) => ({
      ...entry,
      votes: num(entry.votes),
      revenue: num(entry.revenue),
    })),
    recentOrders: (payload.recentOrders ?? []).map(toOrder),
  };
}

/**
 * Les agrégats sont calculés par la base : le coût ne dépend plus du volume
 * de commandes, contrairement à un chargement intégral côté application.
 */
async function loadStats(organizerId: string | null): Promise<AdminStats> {
  const { data, error } = await getSupabaseAdmin().rpc('dashboard_stats', {
    p_organizer_id: organizerId,
  });

  if (error) {
    console.error('[STATS] ❌', error.message);
    return EMPTY_STATS;
  }

  return normalize(data as StatsPayload);
}

/** Statistiques du tableau de bord organisateur. */
export async function getOrganizerStats(): Promise<OrganizerStats> {
  const session = await auth();
  if (!session?.user?.id) return EMPTY_STATS;

  return loadStats(session.user.id);
}

/** Statistiques globales de la plateforme. */
export async function getAdminStats(): Promise<AdminStats> {
  const session = await auth();
  if (session?.user?.role !== 'admin') return EMPTY_STATS;

  return loadStats(null);
}
