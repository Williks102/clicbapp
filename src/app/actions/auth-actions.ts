'use server';

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { UserRow } from '@/lib/supabase/types';

/** Coût bcrypt : compromis usuel entre résistance au calcul et latence de connexion. */
const BCRYPT_ROUNDS = 12;

const signupSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  role: z.enum(['customer', 'organizer']).default('customer'),
});

export type SignupFormData = z.infer<typeof signupSchema>;

export type SignupResult = {
  success: boolean;
  error?: string;
  userId?: string;
};

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * Valide les identifiants d'un utilisateur pour NextAuth.
 *
 * Le mot de passe est comparé au haché bcrypt stocké en base. En cas d'email
 * inconnu, une comparaison factice est tout de même effectuée afin que le
 * temps de réponse ne révèle pas l'existence du compte.
 */
export async function validateCredentials(credentials: unknown) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;

  try {
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
      // Comparaison à vide : uniformise le temps de réponse.
      await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu');
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) return null;

    if (user.disabled || user.deleted) {
      console.warn(`[AUTH] ⛔ Connexion refusée : compte désactivé (${user.email})`);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    console.error('[AUTH] ❌ Erreur de validation des identifiants :', error);
    return null;
  }
}

export async function createUserAccount(data: SignupFormData): Promise<SignupResult> {
  try {
    const validated = signupSchema.parse(data);
    const supabase = getSupabaseAdmin();

    const passwordHash = await bcrypt.hash(validated.password, BCRYPT_ROUNDS);

    const { data: created, error } = await supabase
      .from('users')
      .insert({
        name: validated.name,
        email: validated.email,
        password_hash: passwordHash,
        role: validated.role,
        ...(validated.role === 'organizer' ? { bio: '' } : {}),
      })
      .select('id')
      .single();

    if (error) {
      // 23505 : violation de la contrainte d'unicité sur l'e-mail.
      if (error.code === '23505') {
        return { success: false, error: 'Un compte existe déjà avec cet email.' };
      }
      console.error('[SIGNUP] ❌', error.message);
      return {
        success: false,
        error: 'Erreur lors de la création du compte. Veuillez réessayer.',
      };
    }

    const userId = (created as { id: string }).id;

    // Profil public, nécessaire pour la page /organizers/[id].
    if (validated.role === 'organizer') {
      const { error: organizerError } = await supabase.from('organizers').insert({
        id: userId,
        name: validated.name,
        bio: '',
        avatar: 'organizer-1',
      });

      if (organizerError) {
        console.error('[SIGNUP] ⚠️ Profil organisateur non créé :', organizerError.message);
      }
    }

    return { success: true, userId };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    console.error('[SIGNUP] ❌ Erreur inattendue :', error);
    return {
      success: false,
      error: 'Une erreur est survenue lors de la création du compte.',
    };
  }
}

/** Utilisé pour la validation en temps réel du formulaire d'inscription. */
export async function checkEmailAvailability(email: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error) return false;
    return data === null;
  } catch (error) {
    console.error('[EMAIL_CHECK] ❌', error);
    return false;
  }
}

/** Vérifie le mot de passe actuel d'un utilisateur (changement de mot de passe). */
export async function verifyCurrentPassword(
  userId: string,
  password: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return false;
  return bcrypt.compare(password, (data as { password_hash: string }).password_hash);
}

/** Hache un mot de passe destiné à être stocké. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
