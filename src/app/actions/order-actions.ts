'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { toOrder } from '@/lib/supabase/mappers';
import type { CandidateRow, CompetitionRow, OrderRow, VotePackRow } from '@/lib/supabase/types';
import { generateId } from '@/lib/utils';
import { initializeTransaction } from '@/lib/paystack';
import { settleOrder } from '@/lib/settle-order';
import { resolveBaseUrl } from '@/lib/base-url';
import type { Order, PaymentInitResult } from '@/lib/types';

/** URL publique du site, utilisée comme page de retour après paiement. */
const baseUrl = resolveBaseUrl;

const votePackOrderSchema = z.object({
  competitionId: z.string().min(1),
  candidateId: z.string().min(1),
  packId: z.string().min(1),
  fullName: z.string().min(2, 'Le nom complet est requis.'),
  email: z.string().email('Adresse e-mail invalide.'),
  phone: z.string().optional(),
});

export type VotePackOrderInput = z.infer<typeof votePackOrderSchema>;

/** Le vote est-il ouvert à cet instant, d'après la base ? */
function isVotingOpenRow(
  competition: Pick<
    CompetitionRow,
    'status' | 'voting_enabled' | 'voting_starts_at' | 'voting_ends_at'
  >
) {
  // Un événement de diffusion pure n'a ni scrutin ni fenêtre de vote.
  if (!competition.voting_enabled) return false;
  if (!competition.voting_starts_at || !competition.voting_ends_at) return false;

  const now = Date.now();
  return (
    competition.status === 'voting' &&
    now >= new Date(competition.voting_starts_at).getTime() &&
    now <= new Date(competition.voting_ends_at).getTime()
  );
}

/**
 * Crée une commande PENDING pour un pack de votes.
 * Le prix et le nombre de votes proviennent exclusivement de la base : le
 * client ne peut pas les manipuler.
 */
export async function initializeVotePackOrder(
  data: VotePackOrderInput
): Promise<PaymentInitResult> {
  try {
    const parsed = votePackOrderSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      };
    }

    const values = parsed.data;
    const session = await auth();
    const supabase = getSupabaseAdmin();

    const [competitionResult, candidateResult, packResult] = await Promise.all([
      supabase
        .from('competitions')
        .select('id, title, organizer_id, status, voting_enabled, voting_starts_at, voting_ends_at')
        .eq('id', values.competitionId)
        .maybeSingle(),
      supabase
        .from('candidates')
        .select('id, competition_id, name, eliminated')
        .eq('id', values.candidateId)
        .maybeSingle(),
      supabase
        .from('vote_packs')
        .select('id, competition_id, name, votes, price')
        .eq('id', values.packId)
        .maybeSingle(),
    ]);

    const competition = competitionResult.data as Pick<
      CompetitionRow,
      | 'id' | 'title' | 'organizer_id' | 'status'
      | 'voting_enabled' | 'voting_starts_at' | 'voting_ends_at'
    > | null;
    const candidate = candidateResult.data as Pick<
      CandidateRow,
      'id' | 'competition_id' | 'name' | 'eliminated'
    > | null;
    const pack = packResult.data as Pick<
      VotePackRow,
      'id' | 'competition_id' | 'name' | 'votes' | 'price'
    > | null;

    if (!competition) return { success: false, error: 'Concours introuvable.' };
    if (!candidate) return { success: false, error: 'Candidat introuvable.' };
    if (!pack || pack.competition_id !== competition.id) {
      return { success: false, error: 'Pack de votes introuvable.' };
    }
    if (candidate.competition_id !== competition.id) {
      return { success: false, error: "Ce candidat ne participe pas à ce concours." };
    }
    if (candidate.eliminated) {
      return { success: false, error: 'Ce candidat est éliminé.' };
    }
    if (!isVotingOpenRow(competition)) {
      return { success: false, error: 'Les votes ne sont pas ouverts pour ce concours.' };
    }

    const reference = generateId(`VOTE-${competition.id.slice(0, 4)}`);
    const amount = Number(pack.price);

    const { error } = await supabase.from('orders').insert({
      id: reference,
      type: 'VOTE_PACK',
      competition_id: competition.id,
      competition_title: competition.title,
      organizer_id: competition.organizer_id,
      candidate_id: candidate.id,
      candidate_name: candidate.name,
      pack_id: pack.id,
      pack_name: pack.name,
      votes: pack.votes,
      amount,
      customer_name: values.fullName,
      customer_email: values.email,
      customer_phone: values.phone ?? null,
      user_id: session?.user?.id ?? null,
      status: 'PENDING',
    });

    if (error) throw new Error(error.message);

    // La transaction est créée de serveur à serveur : le montant ne transite
    // jamais par le navigateur.
    const payment = await initializeTransaction({
      email: values.email,
      amount,
      reference,
      callbackUrl: `${baseUrl()}/vote/success?reference=${reference}`,
      metadata: {
        competition: competition.title,
        candidate: candidate.name,
        pack: pack.name,
        votes: pack.votes,
      },
    });

    if (!payment.success) {
      await supabase.from('orders').update({ status: 'FAILED' }).eq('id', reference);
      return { success: false, error: payment.error };
    }

    return {
      success: true,
      reference,
      amount,
      authorizationUrl: payment.authorizationUrl,
    };
  } catch (error) {
    console.error('[INIT VOTE ORDER] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

const liveAccessOrderSchema = z.object({
  competitionId: z.string().min(1),
  fullName: z.string().min(2, 'Le nom complet est requis.'),
  email: z.string().email('Adresse e-mail invalide.'),
  phone: z.string().optional(),
});

export type LiveAccessOrderInput = z.infer<typeof liveAccessOrderSchema>;

/** Crée une commande PENDING pour l'accès à une diffusion payante. */
export async function initializeLiveAccessOrder(
  data: LiveAccessOrderInput
): Promise<PaymentInitResult> {
  try {
    const parsed = liveAccessOrderSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      };
    }

    const values = parsed.data;
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Connectez-vous pour acheter un accès au direct.' };
    }

    const supabase = getSupabaseAdmin();

    const { data: competitionData } = await supabase
      .from('competitions')
      .select('id, title, organizer_id, live_enabled, live_paid, live_price, live_title')
      .eq('id', values.competitionId)
      .maybeSingle();

    const competition = competitionData as Pick<
      CompetitionRow,
      'id' | 'title' | 'organizer_id' | 'live_enabled' | 'live_paid' | 'live_price' | 'live_title'
    > | null;

    if (!competition) return { success: false, error: 'Concours introuvable.' };
    if (!competition.live_enabled) {
      return { success: false, error: "Ce concours n'a pas de diffusion en direct." };
    }
    if (!competition.live_paid || Number(competition.live_price) <= 0) {
      return { success: false, error: 'Le direct est en accès libre.' };
    }

    const { data: existing } = await supabase
      .from('live_access')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('competition_id', competition.id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Vous avez déjà accès à ce direct.' };
    }

    const reference = generateId(`LIVE-${competition.id.slice(0, 4)}`);
    const amount = Number(competition.live_price);

    const { error } = await supabase.from('orders').insert({
      id: reference,
      type: 'LIVE_ACCESS',
      competition_id: competition.id,
      competition_title: competition.title,
      organizer_id: competition.organizer_id,
      amount,
      customer_name: values.fullName,
      customer_email: values.email,
      customer_phone: values.phone ?? null,
      user_id: session.user.id,
      status: 'PENDING',
    });

    if (error) throw new Error(error.message);

    const payment = await initializeTransaction({
      email: values.email,
      amount,
      reference,
      callbackUrl: `${baseUrl()}/vote/success?reference=${reference}`,
      metadata: {
        competition: competition.title,
        type: 'Accès au direct',
      },
    });

    if (!payment.success) {
      await supabase.from('orders').update({ status: 'FAILED' }).eq('id', reference);
      return { success: false, error: payment.error };
    }

    return {
      success: true,
      reference,
      amount,
      authorizationUrl: payment.authorizationUrl,
    };
  } catch (error) {
    console.error('[INIT LIVE ORDER] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

// ==================== LECTURE ====================

export async function getOrder(reference: string): Promise<Order | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { data } = await getSupabaseAdmin()
    .from('orders')
    .select('*')
    .eq('id', reference)
    .maybeSingle();

  if (!data) return null;

  const order = toOrder(data as OrderRow);

  const isOwner =
    order.userId === session.user.id || order.customerEmail === session.user.email;
  const isOrganizer = order.organizerId === session.user.id;

  if (!isOwner && !isOrganizer && session.user.role !== 'admin') return null;

  return order;
}

/**
 * Statut d'une commande, consultable depuis la page de retour de paiement.
 * La référence est un identifiant aléatoire non devinable : aucune donnée
 * personnelle n'est exposée ici.
 */
export async function getOrderStatus(reference: string): Promise<{
  found: boolean;
  status?: Order['status'];
  type?: Order['type'];
  amount?: number;
  votes?: number;
  candidateId?: string;
  candidateName?: string;
  competitionId?: string;
  competitionTitle?: string;
}> {
  const supabase = getSupabaseAdmin();

  const columns =
    'status, type, amount, votes, candidate_id, candidate_name, competition_id, competition_title';

  let { data } = await supabase.from('orders').select(columns).eq('id', reference).maybeSingle();

  if (!data) return { found: false };

  /*
   * Rapprochement de secours.
   *
   * Si la commande est encore en attente, le webhook n'est pas passé — URL mal
   * déclarée, domaine injoignable, ou simple délai. On interroge alors Paystack
   * directement : l'acheteur qui revient sur cette page voit son paiement pris
   * en compte au lieu d'attendre une notification qui ne viendra peut-être
   * jamais. Le montant provient de l'API Paystack, jamais de l'appelant.
   */
  if ((data as { status: Order['status'] }).status === 'PENDING') {
    try {
      const outcome = await settleOrder(reference, 'callback');
      if (outcome === 'paid' || outcome === 'already_processed') {
        const { data: refreshed } = await supabase
          .from('orders')
          .select(columns)
          .eq('id', reference)
          .maybeSingle();
        if (refreshed) data = refreshed;
      }
    } catch (error) {
      // Un rapprochement en échec laisse la commande en attente : le webhook
      // ou une visite ultérieure la reprendront.
      console.error('[ORDER STATUS] ⚠️ Rapprochement impossible :', error);
    }
  }

  const order = data as Pick<
    OrderRow,
    | 'status'
    | 'type'
    | 'amount'
    | 'votes'
    | 'candidate_id'
    | 'candidate_name'
    | 'competition_id'
    | 'competition_title'
  >;

  return {
    found: true,
    status: order.status,
    type: order.type,
    amount: Number(order.amount),
    votes: order.votes ?? undefined,
    candidateId: order.candidate_id ?? undefined,
    candidateName: order.candidate_name ?? undefined,
    competitionId: order.competition_id,
    competitionTitle: order.competition_title,
  };
}

/** Commandes de l'utilisateur connecté. */
export async function getMyOrders(): Promise<Order[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  const { data, error } = await getSupabaseAdmin()
    .from('orders')
    .select('*')
    .eq('customer_email', session.user.email)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET MY ORDERS] ❌', error.message);
    return [];
  }

  return (data as OrderRow[]).map(toOrder);
}

/** Commandes reçues par un organisateur (toutes les commandes pour un admin). */
export async function getOrganizerOrders(): Promise<Order[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  let request = getSupabaseAdmin()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (session.user.role !== 'admin') {
    request = request.eq('organizer_id', session.user.id);
  }

  const { data, error } = await request;

  if (error) {
    console.error('[GET ORGANIZER ORDERS] ❌', error.message);
    return [];
  }

  return (data as OrderRow[]).map(toOrder);
}
