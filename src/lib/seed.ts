// src/lib/seed.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

import { events, organizers, categories, users as userProfiles } from './data';
import type { User as UserProfile } from './types';

// Construire le chemin vers le fichier de clé du compte de service
const serviceAccountKeyPath = path.resolve(process.cwd(), 'service-account-key.json');

if (!fs.existsSync(serviceAccountKeyPath)) {
    console.error(`Erreur: Le fichier de clé du compte de service 'service-account-key.json' est introuvable à la racine du projet.`);
    console.error("Veuillez le télécharger depuis votre console Firebase, le renommer en 'service-account-key.json' et le placer à la racine du projet.");
    process.exit(1);
}

// Lire et parser le fichier de clé
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf8'));

// Initialiser l'application Firebase Admin
const adminApp = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(adminApp);
const auth = getAuth(adminApp);

const usersToSeed = [
    {
        email: 'koffiw4@gmail.com',
        password: 'Login24@s',
        profileId: 'admin-koffiw4'
    },
    {
        email: 'lagopauline@gmail.com',
        password: 'Login24@s',
        profileId: 'org-lagopauline'
    }
];

async function seedAuthUsers() {
    console.log('Début du seeding pour Firebase Authentication...');
    let createdUsersCount = 0;
    let updatedUsersCount = 0;
    const seededUserIds: { [key: string]: string } = {};

    for (const user of usersToSeed) {
        try {
            // Essayer de récupérer l'utilisateur pour voir s'il existe
            const userRecord = await auth.getUserByEmail(user.email);
            console.log(`Utilisateur existant trouvé: ${user.email} (UID: ${userRecord.uid}). Mise à jour du mot de passe.`);
            // Mettre à jour le mot de passe
            await auth.updateUser(userRecord.uid, { password: user.password });
            updatedUsersCount++;
            seededUserIds[user.profileId] = userRecord.uid;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Si l'utilisateur n'existe pas, le créer
                console.log(`Création d'un nouvel utilisateur: ${user.email}`);
                const newUserRecord = await auth.createUser({
                    email: user.email,
                    password: user.password,
                    emailVerified: true,
                });
                createdUsersCount++;
                seededUserIds[user.profileId] = newUserRecord.uid;
            } else {
                // Gérer d'autres erreurs potentielles
                console.error(`Erreur lors de la gestion de l'utilisateur ${user.email}:`, error);
                throw error;
            }
        }
    }
    console.log(`✅ Auth seeding terminé. ${createdUsersCount} utilisateurs créés, ${updatedUsersCount} mis à jour.`);
    return seededUserIds;
}


async function seedCollection(collectionName: string, data: any[], idMapping: { [key: string]: string } = {}) {
  console.log(`Début du seeding pour la collection: ${collectionName}...`);
  const collectionRef = db.collection(collectionName);
  
  // Pour la collection 'users', on ne supprime pas tout pour préserver d'autres comptes
  if (collectionName !== 'users') {
      const snapshot = await collectionRef.get();
      if (!snapshot.empty) {
        console.log(`Suppression de ${snapshot.size} documents existants dans ${collectionName}...`);
        const deleteBatch = db.batch();
        snapshot.docs.forEach(doc => {
            deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
      }
  }
  
  const batch = db.batch();
  let count = 0;

  for (const item of data) {
    let docId = item.id;
    const newItem = { ...item };

    // Si c'est un profil utilisateur, utilisons le vrai UID de l'authentification
    if (collectionName === 'users' && idMapping[item.id]) {
        docId = idMapping[item.id];
        newItem.id = docId; // Mettre à jour l'ID dans le document aussi
    }
    
    // Si la collection n'est pas 'users' et qu'on a un mapping d'ID, on ne l'ajoute pas
    // C'est pour eviter de recréer les utilisateurs de base
    if (collectionName === 'users' && !Object.values(idMapping).includes(docId) && !userProfiles.find(u => u.id === docId)) {
        continue;
    }


    const docRef = collectionRef.doc(docId);
    batch.set(docRef, newItem);
    count++;
  }

  await batch.commit();
  console.log(`✅ ${count} documents ajoutés/mis à jour dans la collection ${collectionName}.`);
}


async function main() {
  try {
    console.log('--- Début du script de seeding ---');
    
    // 1. Seed Authentication
    const seededUserUids = await seedAuthUsers();

    // 2. Seed Firestore Collections
    await seedCollection('events', events);
    await seedCollection('organizers', organizers);
    await seedCollection('categories', categories);
    
    // Seed user profiles, en utilisant les vrais UIDs de l'authentification
    await seedCollection('users', userProfiles, seededUserUids);
    
    console.log('--- Seeding terminé avec succès ! ---');
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  }
}

main();
