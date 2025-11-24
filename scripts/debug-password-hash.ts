// scripts/debug-password-hash.ts
// Script pour diagnostiquer et corriger le problème de bcrypt
// Exécuter avec: npx tsx scripts/debug-password-hash.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
import admin from 'firebase-admin';

// Charger les variables d'environnement depuis .env.local
config({ path: resolve(process.cwd(), '.env.local') });

console.log('🔧 Chargement des variables d\'environnement...');
console.log(`   FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? '✅' : '❌'}`);
console.log(`   FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL ? '✅' : '❌'}`);
console.log(`   FIREBASE_PRIVATE_KEY: ${process.env.FIREBASE_PRIVATE_KEY ? '✅' : '❌'}\n`);

// Configuration Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || "studio-6644592922-93aa3",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Vérifier que toutes les variables sont présentes
if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('❌ ERREUR: Variables d\'environnement manquantes!\n');
  console.error('Assurez-vous que votre fichier .env.local contient:');
  console.error('  - FIREBASE_PROJECT_ID');
  console.error('  - FIREBASE_CLIENT_EMAIL');
  console.error('  - FIREBASE_PRIVATE_KEY\n');
  process.exit(1);
}

// Initialiser Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Le hash qui devrait correspondre à "password123"
const CORRECT_HASH = '$2a$10$3s/gU6.ExyvNyREU5GjP/.S5sP7t5gWJ7GZa1UqfspgU7Sg5OqVpS';
const TEST_PASSWORD = 'password123';
const TEST_EMAIL = 'lagopauline28@gmail.com';

async function debugPasswordHash() {
  console.log('🔍 DIAGNOSTIC DU HASH DE MOT DE PASSE\n');
  console.log('=' .repeat(60));

  // ========================================
  // ÉTAPE 1 : Vérifier que le hash de référence est valide
  // ========================================
  console.log('\n📋 ÉTAPE 1 : Vérification du hash de référence');
  console.log('-'.repeat(60));
  
  try {
    const isCorrectHashValid = await bcrypt.compare(TEST_PASSWORD, CORRECT_HASH);
    console.log(`Hash de référence: ${CORRECT_HASH.substring(0, 30)}...`);
    console.log(`Test avec "${TEST_PASSWORD}": ${isCorrectHashValid ? '✅ VALIDE' : '❌ INVALIDE'}`);
    
    if (!isCorrectHashValid) {
      console.error('\n⚠️  PROBLÈME: Le hash de référence ne correspond pas à "password123"');
      console.log('Génération d\'un nouveau hash...');
      const newHash = await bcrypt.hash(TEST_PASSWORD, 10);
      console.log(`Nouveau hash généré: ${newHash}`);
      console.log('\n💡 Utilisez ce nouveau hash dans votre base de données.');
      return;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du hash de référence:', error);
    return;
  }

  // ========================================
  // ÉTAPE 2 : Récupérer l'utilisateur depuis Firestore
  // ========================================
  console.log('\n📋 ÉTAPE 2 : Récupération de l\'utilisateur depuis Firestore');
  console.log('-'.repeat(60));
  
  let userDoc;
  let userData;
  
  try {
    const usersSnapshot = await db.collection('users')
      .where('email', '==', TEST_EMAIL)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error(`❌ Aucun utilisateur trouvé avec l'email: ${TEST_EMAIL}`);
      console.log('\n💡 Vérifiez que l\'utilisateur existe dans Firestore.');
      return;
    }

    userDoc = usersSnapshot.docs[0];
    userData = userDoc.data();
    
    console.log(`✅ Utilisateur trouvé:`);
    console.log(`   ID: ${userDoc.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Nom: ${userData.name}`);
    console.log(`   Rôle: ${userData.role}`);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
    return;
  }

  // ========================================
  // ÉTAPE 3 : Vérifier le passwordHash dans Firestore
  // ========================================
  console.log('\n📋 ÉTAPE 3 : Vérification du passwordHash');
  console.log('-'.repeat(60));
  
  if (!userData.passwordHash) {
    console.error('❌ Le champ "passwordHash" n\'existe PAS dans Firestore');
    console.log('\n💡 Solution: Ajouter le passwordHash avec le script add-password-hash.ts');
    return;
  }

  const storedHash = userData.passwordHash;
  console.log(`Hash stocké: ${storedHash.substring(0, 30)}...`);
  console.log(`Longueur: ${storedHash.length} caractères`);
  console.log(`Commence par: ${storedHash.substring(0, 7)}`);

  // ========================================
  // ÉTAPE 4 : Comparer les hashes
  // ========================================
  console.log('\n📋 ÉTAPE 4 : Comparaison des hashes');
  console.log('-'.repeat(60));
  
  console.log(`Hash de référence: ${CORRECT_HASH}`);
  console.log(`Hash dans Firestore: ${storedHash}`);
  console.log(`Les hashes sont identiques: ${storedHash === CORRECT_HASH ? '✅ OUI' : '❌ NON'}`);

  // ========================================
  // ÉTAPE 5 : Tester bcrypt.compare
  // ========================================
  console.log('\n📋 ÉTAPE 5 : Test de bcrypt.compare');
  console.log('-'.repeat(60));
  
  try {
    // Test 1: Avec le hash de référence (devrait être true)
    const test1 = await bcrypt.compare(TEST_PASSWORD, CORRECT_HASH);
    console.log(`Test 1 - Hash de référence + "${TEST_PASSWORD}": ${test1 ? '✅ VALIDE' : '❌ INVALIDE'}`);

    // Test 2: Avec le hash stocké dans Firestore
    const test2 = await bcrypt.compare(TEST_PASSWORD, storedHash);
    console.log(`Test 2 - Hash Firestore + "${TEST_PASSWORD}": ${test2 ? '✅ VALIDE' : '❌ INVALIDE'}`);

    // Test 3: Avec d'autres mots de passe courants
    const commonPasswords = ['password', 'Password123', 'PASSWORD123', 'pass123'];
    console.log('\nTest avec d\'autres mots de passe courants:');
    for (const pwd of commonPasswords) {
      const result = await bcrypt.compare(pwd, storedHash);
      console.log(`   "${pwd}": ${result ? '✅ MATCH' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de bcrypt.compare:', error);
  }

  // ========================================
  // ÉTAPE 6 : Diagnostic et recommandations
  // ========================================
  console.log('\n📋 ÉTAPE 6 : Diagnostic et recommandations');
  console.log('-'.repeat(60));

  const isStoredHashValid = await bcrypt.compare(TEST_PASSWORD, storedHash);

  if (storedHash !== CORRECT_HASH) {
    console.log('\n⚠️  PROBLÈME IDENTIFIÉ:');
    console.log('   Le hash dans Firestore est DIFFÉRENT du hash de référence.');
    console.log('\n🔧 SOLUTIONS:');
    console.log('   1. Le mot de passe n\'est PAS "password123"');
    console.log('   2. Le hash a été généré avec un autre salt/rounds');
    console.log('   3. Le hash est corrompu');
    
    if (isStoredHashValid) {
      console.log('\n✅ BONNE NOUVELLE: Le hash stocké fonctionne quand même avec "password123"!');
      console.log('   Aucune action nécessaire.');
    } else {
      console.log('\n❌ MAUVAISE NOUVELLE: Le hash ne correspond à aucun mot de passe testé.');
      console.log('\n🚀 ACTION REQUISE:');
      console.log('   Remplacer le hash dans Firestore par le hash de référence.');
      
      const shouldFix = process.argv.includes('--fix');
      if (shouldFix) {
        console.log('\n🔧 Correction en cours...');
        await db.collection('users').doc(userDoc.id).update({
          passwordHash: CORRECT_HASH
        });
        console.log('✅ Hash corrigé dans Firestore!');
        console.log(`   Vous pouvez maintenant vous connecter avec: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
      } else {
        console.log('\n💡 Pour corriger automatiquement, relancez avec: npx tsx scripts/debug-password-hash.ts --fix');
      }
    }
  } else {
    console.log('\n✅ Le hash dans Firestore est CORRECT.');
    console.log('   Il correspond au hash de référence.');
    
    if (!isStoredHashValid) {
      console.log('\n⚠️  MAIS bcrypt.compare retourne false!');
      console.log('   Cela peut indiquer:');
      console.log('   - Un problème avec la version de bcrypt');
      console.log('   - Un problème de corruption du hash');
      console.log('   - Un problème de comparaison asynchrone');
    }
  }

  // ========================================
  // RÉSUMÉ FINAL
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  console.log(`Email testé: ${TEST_EMAIL}`);
  console.log(`Mot de passe testé: ${TEST_PASSWORD}`);
  console.log(`Hash de référence valide: ${await bcrypt.compare(TEST_PASSWORD, CORRECT_HASH) ? '✅' : '❌'}`);
  console.log(`Hash Firestore valide: ${isStoredHashValid ? '✅' : '❌'}`);
  console.log(`Hashes identiques: ${storedHash === CORRECT_HASH ? '✅' : '❌'}`);
  console.log('='.repeat(60));

  // ========================================
  // TEST BONUS : Générer un nouveau hash et le tester immédiatement
  // ========================================
  console.log('\n📋 TEST BONUS : Génération d\'un nouveau hash');
  console.log('-'.repeat(60));
  
  const freshHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const freshTest = await bcrypt.compare(TEST_PASSWORD, freshHash);
  console.log(`Nouveau hash généré: ${freshHash.substring(0, 30)}...`);
  console.log(`Test immédiat: ${freshTest ? '✅ VALIDE' : '❌ INVALIDE'}`);
  
  if (freshTest && !isStoredHashValid) {
    console.log('\n⚠️  Le test avec un nouveau hash fonctionne, mais pas avec le hash stocké.');
    console.log('   Cela confirme que le hash dans Firestore est corrompu ou incorrect.');
  }
}

// Exécuter le diagnostic
console.log('\n🚀 Lancement du diagnostic...\n');
debugPasswordHash()
  .then(() => {
    console.log('\n✅ Diagnostic terminé!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error);
    process.exit(1);
  });