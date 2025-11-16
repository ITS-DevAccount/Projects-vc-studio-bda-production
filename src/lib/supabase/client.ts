import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

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
  // Use createBrowserClient from @supabase/ssr which handles cookies properly
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export function createClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = initClient()
  }
  return browserClient
}

export const supabase = createClient()

/**
 * Check if an error is a refresh token error
 */
export function isRefreshTokenError(error: any): boolean {
  const message = error?.message || error?.error_description || ''
  return (
    message.includes('refresh_token_not_found') ||
    message.includes('Invalid Refresh Token') ||
    message.includes('Refresh Token Not Found') ||
    message.includes('JWT expired') ||
    error?.status === 401
  )
}

/**
 * Clear stale auth session
 */
export async function clearStaleAuth(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' })
    // Also clear any localStorage items related to Supabase
    if (typeof window !== 'undefined') {
      // Clear all Supabase-related localStorage items
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
    }
  } catch (error) {
    // Ignore errors during cleanup
    console.log('Error during auth cleanup:', error)
  }
}

// Handle auth errors and clear stale tokens
if (typeof window !== 'undefined') {
  const client = createClient()

  // Clear stale auth data on initialization
  client.auth.getSession().catch(async (error) => {
    if (isRefreshTokenError(error)) {
      console.log('Clearing stale auth session on init')
      await clearStaleAuth()
    }
  })

  // Listen for auth errors globally
  client.auth.onAuthStateChange(async (event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      if (session) {
        console.log('Token refreshed successfully')
      } else {
        console.log('Token refresh failed, clearing session')
        await clearStaleAuth()
      }
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out')
    }
  })
}