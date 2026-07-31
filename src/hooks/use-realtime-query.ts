'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/client';

type EqualityFilters = Record<string, string | number | boolean>;

export type RealtimeQueryOptions<Row, T> = {
  table: string;
  /** Colonnes à sélectionner, jointures comprises. */
  select?: string;
  /** Filtres d'égalité appliqués à la requête initiale et aux mises à jour. */
  match?: EqualityFilters;
  /** Filtre « valeur parmi » — appliqué à la requête et revérifié sur chaque delta. */
  inFilter?: { column: string; values: readonly string[] };
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  /** Conversion ligne SQL → type applicatif. */
  map: (row: Row) => T;
  /** Tri appliqué côté client après application des deltas temps réel. */
  compare?: (a: T, b: T) => number;
  /** Identifiant stable d'un élément (par défaut `id`). */
  getId?: (item: T) => string;
  enabled?: boolean;
};

export type RealtimeQueryResult<T> = {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
};

/**
 * Charge une table puis la maintient à jour en temps réel.
 *
 * Contrairement à `onSnapshot`, Supabase Realtime ne renvoie pas un jeu de
 * résultats trié : il diffuse des événements de ligne. Le motif est donc
 * « SELECT initial, puis application des deltas », le tri et la limite étant
 * réappliqués côté client après chaque événement.
 */
export function useRealtimeQuery<Row extends { id: string }, T>(
  options: RealtimeQueryOptions<Row, T>
): RealtimeQueryResult<T> {
  const {
    table,
    select = '*',
    match,
    inFilter,
    orderBy,
    limit,
    enabled = true,
  } = options;

  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /*
   * Identifiant propre à cette instance du hook, intégré au nom du canal.
   *
   * `supabase.channel(nom)` renvoie le canal existant lorsqu'un canal porte
   * déjà ce nom. Un nom dérivé de la seule requête entrait donc en collision
   * dès que deux composants interrogeaient la même table avec le même filtre —
   * le classement et le panneau de vote sur la page du direct, par exemple.
   * Le second recevait un canal déjà abonné, et `.on()` après `subscribe()`
   * lève une exception qui remontait jusqu'à la page.
   *
   * Le remontage des effets en développement produisait la même collision, la
   * suppression du canal précédent étant asynchrone.
   */
  const instanceId = useId();

  // Ces fonctions changent d'identité à chaque rendu : les garder dans des refs
  // évite de recréer l'abonnement temps réel en boucle.
  const mapRef = useRef(options.map);
  const compareRef = useRef(options.compare);
  const getIdRef = useRef(options.getId);
  mapRef.current = options.map;
  compareRef.current = options.compare;
  getIdRef.current = options.getId;

  // Clés primitives : stabilisent les dépendances de l'effet.
  const matchKey = useMemo(() => JSON.stringify(match ?? {}), [match]);
  const inKey = useMemo(
    () => (inFilter ? `${inFilter.column}:${inFilter.values.join(',')}` : ''),
    [inFilter]
  );
  const orderKey = orderBy
    ? `${orderBy.column}:${orderBy.ascending === false ? 'desc' : 'asc'}`
    : '';

  const identify = useCallback(
    (item: T) => getIdRef.current?.(item) ?? (item as unknown as { id: string }).id,
    []
  );

  const normalize = useCallback(
    (items: T[]) => {
      const sorted = compareRef.current ? [...items].sort(compareRef.current) : items;
      return limit ? sorted.slice(0, limit) : sorted;
    },
    [limit]
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError(new Error('Configuration Supabase absente.'));
      setIsLoading(false);
      return;
    }

    const filters: EqualityFilters = matchKey ? JSON.parse(matchKey) : {};
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    /** La ligne satisfait-elle encore les filtres de la requête ? */
    const matches = (row: Row): boolean => {
      for (const [column, value] of Object.entries(filters)) {
        if ((row as Record<string, unknown>)[column] !== value) return false;
      }
      if (inFilter) {
        const actual = (row as Record<string, unknown>)[inFilter.column];
        if (!inFilter.values.includes(actual as string)) return false;
      }
      return true;
    };

    // ---- Chargement initial ----
    const load = async () => {
      let request = supabase.from(table).select(select);

      for (const [column, value] of Object.entries(filters)) {
        request = request.eq(column, value);
      }
      if (inFilter) {
        request = request.in(inFilter.column, [...inFilter.values]);
      }
      if (orderBy) {
        request = request.order(orderBy.column, {
          ascending: orderBy.ascending !== false,
        });
      }
      if (limit) {
        request = request.limit(limit);
      }

      const { data: rows, error: queryError } = await request;
      if (cancelled) return;

      if (queryError) {
        console.error(
          `[Supabase] ❌ Lecture de « ${table} » impossible (code: ${queryError.code}) : ${queryError.message}` +
            (queryError.hint ? `\n→ ${queryError.hint}` : '')
        );
        setError(new Error(queryError.message));
        setData(null);
        setIsLoading(false);
        return;
      }

      setData(normalize((rows as unknown as Row[]).map(mapRef.current)));
      setIsLoading(false);
    };

    void load();

    // ---- Abonnement temps réel ----
    // Le serveur n'accepte qu'un seul filtre : les autres critères sont
    // revérifiés côté client par `matches`.
    const [firstColumn, firstValue] = Object.entries(filters)[0] ?? [];

    /*
     * Le temps réel est un confort, pas une condition d'affichage : les données
     * proviennent du SELECT ci-dessus. Un abonnement qui échoue est donc
     * journalisé, jamais propagé — sans quoi la liste, pourtant chargée,
     * disparaîtrait derrière une page d'erreur.
     */
    let channel: RealtimeChannel | null = null;

    try {
      channel = supabase
        .channel(`realtime:${table}:${matchKey}:${inKey}:${instanceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(firstColumn ? { filter: `${firstColumn}=eq.${firstValue}` } : {}),
          },
          (payload: RealtimePostgresChangesPayload<Row>) => {
            if (cancelled) return;

            setData((current) => {
              const items = current ?? [];

              if (payload.eventType === 'DELETE') {
                const removedId = (payload.old as Partial<Row>)?.id;
                if (!removedId) return items;
                return items.filter((item) => identify(item) !== removedId);
              }

              const row = payload.new as Row;
              if (!row?.id) return items;

              // Une ligne qui ne satisfait plus les filtres doit disparaître
              // (par exemple un concours repassé en brouillon).
              if (!matches(row)) {
                return items.filter((item) => identify(item) !== row.id);
              }

              const mapped = mapRef.current(row);
              const index = items.findIndex((item) => identify(item) === row.id);
              const next =
                index >= 0
                  ? items.map((item, i) => (i === index ? mapped : item))
                  : [...items, mapped];

              return normalize(next);
            });
          }
        )
        .subscribe();
    } catch (subscriptionError) {
      console.error(
        `[Supabase] ⚠️ Abonnement temps réel impossible sur « ${table} » : `,
        subscriptionError
      );
    }

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, matchKey, inKey, orderKey, limit, enabled, normalize, identify, instanceId]);

  return { data, isLoading, error };
}

/**
 * Variante pour une ligne unique, identifiée par sa clé primaire.
 */
export function useRealtimeRow<Row extends { id: string }, T>(options: {
  table: string;
  select?: string;
  id: string | null | undefined;
  map: (row: Row) => T;
}): { data: T | null; isLoading: boolean; error: Error | null } {
  const { data, isLoading, error } = useRealtimeQuery<Row, T>({
    table: options.table,
    select: options.select,
    match: options.id ? { id: options.id } : undefined,
    map: options.map,
    enabled: !!options.id,
  });

  return {
    data: data?.[0] ?? null,
    isLoading: options.id ? isLoading : false,
    error,
  };
}
