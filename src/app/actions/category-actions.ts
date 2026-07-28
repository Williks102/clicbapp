'use server';

import { firestore } from '@/lib/firebase-admin';
import { Category } from '@/lib/types';

/**
 * Récupère toutes les catégories
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const categoriesSnapshot = await firestore.collection('categories').get();

    return categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Category[];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
}

/**
 * Initialise les catégories par défaut si elles n'existent pas
 */
export async function initializeCategories(): Promise<{ success: boolean; message: string }> {
  try {
    const categoriesSnapshot = await firestore.collection('categories').get();

    // Si des catégories existent déjà, ne rien faire
    if (!categoriesSnapshot.empty) {
      return {
        success: true,
        message: `${categoriesSnapshot.size} catégories existent déjà.`
      };
    }

    // Catégories de concours par défaut
    const defaultCategories = [
      { name: 'Beauté & Miss' },
      { name: 'Musique & Télé-crochet' },
      { name: 'Danse' },
      { name: 'Awards' },
      { name: 'Sport' },
      { name: 'Mode' },
      { name: 'Humour' },
      { name: 'Talents & Innovation' },
      { name: 'Autre' }
    ];

    // Créer les catégories en batch
    const batch = firestore.batch();

    defaultCategories.forEach(category => {
      const docRef = firestore.collection('categories').doc();
      batch.set(docRef, category);
    });

    await batch.commit();

    return {
      success: true,
      message: `${defaultCategories.length} catégories créées avec succès!`
    };
  } catch (error) {
    console.error('Error initializing categories:', error);
    return {
      success: false,
      message: 'Erreur lors de l\'initialisation des catégories.'
    };
  }
}

/**
 * Ajoute une nouvelle catégorie
 */
export async function addCategory(name: string): Promise<{ success: boolean; message: string; categoryId?: string }> {
  try {
    if (!name || name.trim().length === 0) {
      return {
        success: false,
        message: 'Le nom de la catégorie est requis.'
      };
    }

    const docRef = await firestore.collection('categories').add({
      name: name.trim()
    });

    return {
      success: true,
      message: 'Catégorie créée avec succès!',
      categoryId: docRef.id
    };
  } catch (error) {
    console.error('Error adding category:', error);
    return {
      success: false,
      message: 'Erreur lors de la création de la catégorie.'
    };
  }
}
