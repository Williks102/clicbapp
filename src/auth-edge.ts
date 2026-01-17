import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// This auth instance is initialized with an Edge-compatible config
// and is ONLY for use in the middleware.
export const { auth } = NextAuth(authConfig);
