import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
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
