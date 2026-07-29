'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/passwords';
import {
  clientIp,
  consumeRateLimit,
  formatRetryAfter,
  LIMITS,
} from '@/lib/rate-limit';

/**
 * Attention : toute fonction exportée d'un fichier « use server » devient un
 * point d'entrée appelable depuis n'importe quel navigateur. Les primitives de
 * vérification de mot de passe vivent donc dans `@/lib/passwords`, hors de
 * cette surface d'exposition.
 */

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

export async function createUserAccount(data: SignupFormData): Promise<SignupResult> {
  try {
    const validated = signupSchema.parse(data);

    /*
     * Borne la création de comptes en masse. Le compteur est consommé après
     * validation du formulaire mais avant l'écriture : une requête malformée
     * ne doit pas pénaliser l'appelant, une requête valide oui.
     */
    const ipKey = `signup:ip:${clientIp(await headers())}`;
    const verdict = await consumeRateLimit(ipKey, LIMITS.signupByIp);

    if (!verdict.allowed) {
      console.warn(`[SIGNUP] ⛔ Trop d'inscriptions (${ipKey}).`);
      return {
        success: false,
        error: `Trop de tentatives d'inscription. Réessayez dans ${formatRetryAfter(verdict.retryAfter)}.`,
      };
    }

    const supabase = getSupabaseAdmin();

    const passwordHash = await hashPassword(validated.password);

    const { data: created, error } = await supabase
      .from('users')
      .insert({
        name: validated.name,
        email: validated.email,
        password_hash: passwordHash,
        role: validated.role,
      })
      .select('id')
      .single();

    if (error) {
      // 23505 : violation de la contrainte d'unicité sur l'e-mail.
      // Le message reste volontairement identique côté client afin de ne pas
      // transformer l'inscription en outil d'énumération des comptes.
      if (error.code === '23505') {
        return {
          success: false,
          error: "Impossible de créer ce compte. Si vous avez déjà un compte, connectez-vous.",
        };
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
