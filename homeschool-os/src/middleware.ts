import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PREFIXES = ['/sign-in', '/sign-up', '/forgot-password', '/auth', '/_next', '/favicon'];

/**
 * Route protection lives here so an unauthenticated request never reaches a
 * page that would query as a user. The database is still the authority - this
 * is a redirect, not a permission check.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/';
  const isProtected = pathname.startsWith('/app') || pathname.startsWith('/onboarding');

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // A signed-in user has no business on the sign-in screen.
  if (user && (pathname === '/sign-in' || pathname === '/sign-up' || pathname === '/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }

  void isPublic;
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
