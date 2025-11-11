import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function createServerClient(accessToken?: string): Promise<SupabaseClient> {
  // If access token provided, use the old method
  if (accessToken) {
    const options: any = {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    };

    const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, options);

    // Set the session so auth.uid() works in RLS policies
    try {
      const { data: { user }, error: userError } = await client.auth.getUser(accessToken);

      if (user && !userError) {
        await client.auth.setSession({
          access_token: accessToken,
          refresh_token: '',
        });
      } else {
        console.warn('Failed to get user from token:', userError);
      }
    } catch (error) {
      console.error('Error setting session:', error);
    }

    return client;
  }

  // No access token - read session from cookies (Next.js App Router)
  const cookieStore = await cookies();

  return createSSRClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

export async function createClient(accessToken?: string): Promise<SupabaseClient> {
  return createServerClient(accessToken);
}

