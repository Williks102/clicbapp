// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Fixer les headers pour éviter les problèmes d'encodage
  const response = NextResponse.next();
  
  // Désactiver la compression pour les routes d'auth
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    response.headers.set('Content-Encoding', 'identity');
  }
  
  return response;
}

export const config = {
  matcher: ['/api/auth/:path*']
};
