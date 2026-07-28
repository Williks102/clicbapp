'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { AdminStats, Competition, Order, OrganizerStats, User } from '@/lib/types';

const EMPTY_STATS: OrganizerStats = {
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
};

function monthKey(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

/** Agrège les commandes payées en série mensuelle (12 derniers mois). */
function buildMonthlySeries(orders: Order[]) {
  const buckets = new Map<string, { votes: number; revenue: number; time: number }>();

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  for (const order of orders) {
    const date = new Date(order.createdAt);
    if (date < twelveMonthsAgo) continue;

    const key = monthKey(order.createdAt);
    const bucket = buckets.get(key) || {
      votes: 0,
      revenue: 0,
      time: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
    };

    bucket.votes += order.votes ?? 0;
    bucket.revenue += order.amount;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[1].time - b[1].time)
    .map(([month, bucket]) => ({
      month,
      votes: bucket.votes,
      revenue: bucket.revenue,
    }));
}

function computeStats(competitions: Competition[], orders: Order[]): OrganizerStats {
  const paidOrders = orders.filter((o) => o.status === 'PAID');

  const totals = competitions.reduce(
    (acc, competition) => {
      const stats = competition.stats;
      acc.totalVotes += stats?.totalVotes ?? 0;
      acc.paidVotes += stats?.paidVotes ?? 0;
      acc.freeVotes += stats?.freeVotes ?? 0;
      acc.totalCandidates += stats?.candidatesCount ?? 0;
      return acc;
    },
    { totalVotes: 0, paidVotes: 0, freeVotes: 0, totalCandidates: 0 }
  );

  const revenueByCompetition = new Map<string, number>();
  for (const order of paidOrders) {
    revenueByCompetition.set(
      order.competitionId,
      (revenueByCompetition.get(order.competitionId) || 0) + order.amount
    );
  }

  const topCompetitions = competitions
    .map((competition) => ({
      competitionId: competition.id,
      title: competition.title,
      votes: competition.stats?.totalVotes ?? 0,
      revenue: revenueByCompetition.get(competition.id) || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.votes - a.votes)
    .slice(0, 5);

  return {
    totalCompetitions: competitions.length,
    totalCandidates: totals.totalCandidates,
    totalVotes: totals.totalVotes,
    paidVotes: totals.paidVotes,
    freeVotes: totals.freeVotes,
    totalRevenue: paidOrders.reduce((sum, order) => sum + order.amount, 0),
    liveAccessSold: paidOrders.filter((o) => o.type === 'LIVE_ACCESS').length,
    votesByMonth: buildMonthlySeries(paidOrders),
    topCompetitions,
    recentOrders: orders.slice(0, 10),
  };
}

function sortOrders(orders: Order[]) {
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Statistiques du tableau de bord organisateur. */
export async function getOrganizerStats(): Promise<OrganizerStats> {
  try {
    const session = await auth();
    if (!session?.user?.id) return EMPTY_STATS;

    const [competitionsSnap, ordersSnap] = await Promise.all([
      firestore
        .collection('competitions')
        .where('organizerId', '==', session.user.id)
        .get(),
      firestore.collection('orders').where('organizerId', '==', session.user.id).get(),
    ]);

    const competitions = competitionsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Competition
    );
    const orders = sortOrders(
      ordersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Order)
    );

    return computeStats(competitions, orders);
  } catch (error) {
    console.error('[ORGANIZER STATS] ❌', error);
    return EMPTY_STATS;
  }
}

/** Statistiques globales de la plateforme. */
export async function getAdminStats(): Promise<AdminStats> {
  const empty: AdminStats = {
    ...EMPTY_STATS,
    totalOrganizers: 0,
    totalCustomers: 0,
    topOrganizers: [],
  };

  try {
    const session = await auth();
    if (session?.user?.role !== 'admin') return empty;

    const [competitionsSnap, ordersSnap, usersSnap] = await Promise.all([
      firestore.collection('competitions').get(),
      firestore.collection('orders').get(),
      firestore.collection('users').get(),
    ]);

    const competitions = competitionsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Competition
    );
    const orders = sortOrders(
      ordersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Order)
    );
    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User);

    const base = computeStats(competitions, orders);

    const organizerNames = new Map(
      users.filter((u) => u.role === 'organizer').map((u) => [u.id, u.name])
    );

    const perOrganizer = new Map<string, { votes: number; revenue: number }>();
    for (const competition of competitions) {
      const entry = perOrganizer.get(competition.organizerId) || { votes: 0, revenue: 0 };
      entry.votes += competition.stats?.totalVotes ?? 0;
      perOrganizer.set(competition.organizerId, entry);
    }
    for (const order of orders.filter((o) => o.status === 'PAID')) {
      const entry = perOrganizer.get(order.organizerId) || { votes: 0, revenue: 0 };
      entry.revenue += order.amount;
      perOrganizer.set(order.organizerId, entry);
    }

    const topOrganizers = Array.from(perOrganizer.entries())
      .map(([organizerId, entry]) => ({
        organizerId,
        organizerName: organizerNames.get(organizerId) || 'Organisateur',
        votes: entry.votes,
        revenue: entry.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      ...base,
      totalOrganizers: users.filter((u) => u.role === 'organizer' && !u.deleted).length,
      totalCustomers: users.filter((u) => u.role === 'customer' && !u.deleted).length,
      topOrganizers,
    };
  } catch (error) {
    console.error('[ADMIN STATS] ❌', error);
    return empty;
  }
}
