'use server';

import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { CategoryRow } from '@/lib/supabase/types';
import type { Category } from '@/lib/types';

/** Catégories de concours proposées aux organisateurs. */
export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw new Error(error.message);

    return data as CategoryRow[];
  } catch (error) {
    console.error('[GET CATEGORIES] ❌', error);
    return [];
  }
}

/** Les catégories sont des données de référence : seuls les admins les modifient. */
async function ensureAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    throw new Error('Action réservée aux administrateurs.');
  }
}

const DEFAULT_CATEGORIES = [
  'Beauté & Miss',
  'Musique & Télé-crochet',
  'Danse',
  'Awards',
  'Sport',
  'Mode',
  'Humour',
  'Talents & Innovation',
  'Autre',
];

/** Crée les catégories par défaut si la table est vide. */
export async function initializeCategories(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await ensureAdmin();
    const supabase = getSupabaseAdmin();

    const { count, error: countError } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true });

    if (countError) throw new Error(countError.message);

    if ((count ?? 0) > 0) {
      return { success: true, message: `${count} catégories existent déjà.` };
    }

    const { error } = await supabase
      .from('categories')
      .insert(DEFAULT_CATEGORIES.map((name) => ({ name })));

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: `${DEFAULT_CATEGORIES.length} catégories créées avec succès !`,
    };
  } catch (error) {
    console.error('[INIT CATEGORIES] ❌', error);
    return {
      success: false,
      message:
        error instanceof Error && error.message.includes('administrateurs')
          ? error.message
          : "Erreur lors de l'initialisation des catégories.",
    };
  }
}

export async function addCategory(name: string): Promise<{
  success: boolean;
  message: string;
  categoryId?: string;
}> {
  try {
    await ensureAdmin();

    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: 'Le nom de la catégorie est requis.' };
    }

    const { data, error } = await getSupabaseAdmin()
      .from('categories')
      .insert({ name: trimmed })
      .select('id')
      .single();

    if (error) {
      // 23505 : la catégorie existe déjà.
      if (error.code === '23505') {
        return { success: false, message: 'Cette catégorie existe déjà.' };
      }
      throw new Error(error.message);
    }

    return {
      success: true,
      message: 'Catégorie créée avec succès !',
      categoryId: (data as { id: string }).id,
    };
  } catch (error) {
    console.error('[ADD CATEGORY] ❌', error);
    return {
      success: false,
      message:
        error instanceof Error && error.message.includes('administrateurs')
          ? error.message
          : 'Erreur lors de la création de la catégorie.',
    };
  }
}
