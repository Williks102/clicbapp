import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Identifiant non devinable, utilisé comme référence de paiement.
 * `Math.random()` n'est pas cryptographiquement sûr : une référence prédictible
 * permettrait de consulter, voire de forger, les commandes d'autrui.
 */
export function generateId(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${token}`;
}

/** Formate un montant en francs CFA. */
export function formatFCFA(amount: number) {
  return `${Math.round(amount).toLocaleString('fr-FR')} F CFA`;
}

/** Formate un nombre de votes de façon compacte (1 234 -> 1,2 k). */
export function formatVotes(votes: number) {
  if (votes < 1000) return votes.toLocaleString('fr-FR');
  if (votes < 1_000_000) {
    return `${(votes / 1000).toFixed(votes < 10_000 ? 1 : 0).replace('.', ',')} k`;
  }
  return `${(votes / 1_000_000).toFixed(1).replace('.', ',')} M`;
}

/** Découpe un nom complet en prénom / nom pour les passerelles de paiement. */
export function splitFullName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') || firstName };
}
