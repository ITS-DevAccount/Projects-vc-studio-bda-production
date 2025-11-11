import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Missing Supabase environment variables! Check Vercel settings.'
  console.error(errorMsg, {
    url: supabaseUrl ? 'present' : 'MISSING',
    key: supabaseAnonKey ? 'present' : 'MISSING',
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseAnonKey?.length || 0
  })

  // Show visible error in development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    alert('⚠️ Missing Supabase credentials! Check your .env.local file.')
  }
}

let browserClient: SupabaseClient | null = null

function initClient(): SupabaseClient {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}

export function createClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = initClient()
  }
  return browserClient
}

export const supabase = createClient()

// Handle auth errors and clear stale tokens
if (typeof window !== 'undefined') {
  const client = createClient()

  client.auth.onAuthStateChange((event) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed successfully')
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out')
    }
  })

  // Clear stale auth data on initialization
  client.auth.getSession().catch((error) => {
    if (error.message?.includes('refresh_token_not_found') ||
        error.message?.includes('Invalid Refresh Token')) {
      console.log('Clearing stale auth session')
      supabase.auth.signOut({ scope: 'local' })
    }
  })
}