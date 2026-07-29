import 'server-only';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { UserRow } from '@/lib/supabase/types';

/**
 * Primitives d'authentification par mot de passe.
 *
 * Ce module n'est délibérément PAS un fichier « use server » : chaque fonction
 * exportée d'un tel fichier devient un point d'entrée appelable depuis
 * n'importe quel navigateur. Exposer une fonction de vérification de mot de
 * passe en ferait un oracle de force brute.
 */

/** Coût bcrypt : compromis usuel entre résistance au calcul et latence. */
const BCRYPT_ROUNDS = 12;

/**
 * Haché factice utilisé lorsque l'e-mail est inconnu, afin que le temps de
 * réponse ne révèle pas l'existence du compte.
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.iVQTYtjKDUpTBRWr9uWFDlU4KJ9Uf.6';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRow['role'];
};

/**
 * Vérifie un couple e-mail / mot de passe.
 * Retourne `null` sans distinguer l'e-mail inconnu du mot de passe erroné.
 */
export async function verifyLogin(
  email: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, password_hash, role, disabled, deleted')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('[AUTH] ❌ Lecture du compte impossible :', error.message);
    return null;
  }

  const user = data as Pick<
    UserRow,
    'id' | 'name' | 'email' | 'password_hash' | 'role' | 'disabled' | 'deleted'
  > | null;

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  if (!(await bcrypt.compare(password, user.password_hash))) return null;

  if (user.disabled || user.deleted) {
    console.warn(`[AUTH] ⛔ Connexion refusée : compte désactivé (${user.email})`);
    return null;
  }

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Vérifie le mot de passe actuel d'un utilisateur déjà identifié par sa session. */
export async function verifyPasswordForUser(
  userId: string,
  password: string
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return false;
  return bcrypt.compare(password, (data as { password_hash: string }).password_hash);
}
