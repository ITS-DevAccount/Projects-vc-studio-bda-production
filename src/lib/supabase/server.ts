import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function createServerClient(accessToken?: string): Promise<SupabaseClient> {
  const options: any = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  };

  // Add authorization header if token is provided
  if (accessToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
  }

  const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, options);

  // Set the session so auth.uid() works in RLS policies
  if (accessToken) {
    try {
      // Verify token and get user
      const { data: { user }, error: userError } = await client.auth.getUser(accessToken);
      
      if (user && !userError) {
        // Set session - this is critical for RLS policies to work
        await client.auth.setSession({
          access_token: accessToken,
          refresh_token: '', // Not needed for server-side
        });
      } else {
        console.warn('Failed to get user from token:', userError);
      }
    } catch (error) {
      console.error('Error setting session:', error);
    }
  }

  return client;
}

export async function createClient(accessToken?: string): Promise<SupabaseClient> {
  return createServerClient(accessToken);
}

