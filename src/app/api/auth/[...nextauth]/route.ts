// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';

export const { GET, POST } = handlers;

export const runtime = 'nodejs'; // Force l'exécution dans l'environnement Node.js
