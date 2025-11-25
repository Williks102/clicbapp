// src/lib/firebase-admin.ts
import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';

// Initialisation unique de Firebase Admin SDK
if (!admin.apps.length) {
  try {
    console.log('[FIREBASE ADMIN] 🔧 Initializing...');

    // Priorité à FIREBASE_SERVICE_ACCOUNT_BASE64 pour Vercel
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
      );
      
      const storageBucket = serviceAccount.storageBucket || 
                           serviceAccount.storage_bucket || 
                           `${serviceAccount.project_id}.appspot.com`;
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: storageBucket,
      });
      
      console.log('[FIREBASE ADMIN] ✅ Initialized from Base64');
      console.log('[FIREBASE ADMIN] 📦 Storage Bucket:', storageBucket);
    } else {
      // Fallback sur les variables individuelles
      const projectId = process.env.FIREBASE_PROJECT_ID || 'studio-6644592922-93aa3';
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
      
      const serviceAccount = {
        projectId: projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error('❌ Firebase Admin environment variables are not fully defined.');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: storageBucket,
      });
      
      console.log('[FIREBASE ADMIN] ✅ Initialized from individual variables');
      console.log('[FIREBASE ADMIN] 📦 Storage Bucket:', storageBucket);
    }
  } catch (error) {
    console.error('[FIREBASE ADMIN] ❌ Initialization error:', error);
    throw error;
  }
} else {
  console.log('[FIREBASE ADMIN] ℹ️ Already initialized');
}

// Exports centralisés
export const firestore = admin.firestore();

// Fonction pour obtenir le storage bucket avec le nom correct
export function getStorageBucket() {
  const bucketName = admin.app().options.storageBucket;
  if (!bucketName) {
    throw new Error('Storage bucket not configured');
  }
  return getStorage().bucket(bucketName);
}

export const storage = getStorageBucket();
export const firebaseAuth = admin.auth();

export default admin;