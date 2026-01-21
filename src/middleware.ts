import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Check if Supabase environment variables are configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip Supabase auth if environment variables are missing
  if (!supabaseUrl || !supabaseAnonKey) {
    // In development, log a warning but don't fail
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Middleware] Supabase environment variables not configured. Skipping auth refresh.');
    }
    return response;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh session if expired - required for Server Components
    // Use getSession instead of getUser to avoid triggering refresh token errors
    // This will fail gracefully if Supabase is unavailable
    try {
      await supabase.auth.getSession();
    } catch (sessionError: any) {
      // Silently handle auth errors in middleware - let the app handle them
      // Only log in development to avoid noise in production
      if (process.env.NODE_ENV === 'development') {
        const errorMessage = sessionError?.message || 'Unknown error';
        // Only log if it's not a network error (which is expected if Supabase is down)
        if (!errorMessage.includes('fetch failed') && !errorMessage.includes('ECONNREFUSED')) {
          console.warn('[Middleware] Auth session refresh failed:', errorMessage);
        }
      }
    }
  } catch (error: any) {
    // Handle any other errors gracefully
    // Only log in development to avoid noise in production
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Middleware] Auth error:', error?.message || error);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
