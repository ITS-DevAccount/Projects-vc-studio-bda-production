'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isRefreshTokenError, clearStaleAuth } from '@/lib/supabase/client'
import { getDashboardPath } from '@/lib/middleware/dashboardRouter'

export default function DashboardPage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const checkUserRole = async () => {
      // Prevent multiple redirects
      if (isRedirecting) return
      
      try {
        console.log('[Dashboard] Checking user role...')
        
        // Try to get session first (less likely to trigger refresh)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[Dashboard] Session error:', sessionError)
          // If session error, check if it's a refresh token error
          if (isRefreshTokenError(sessionError)) {
            console.log('[Dashboard] Refresh token error detected, clearing stale auth')
            await clearStaleAuth()
          }
          setIsRedirecting(true)
          router.push('/auth/login')
          return
        }

        if (!session?.user) {
          console.log('[Dashboard] No session or user, redirecting to login')
          setIsRedirecting(true)
          router.push('/auth/login')
          return
        }

        console.log('[Dashboard] User found:', session.user.email, 'Determining dashboard path...')
        const path = await getDashboardPath(session.user.id)
        console.log('[Dashboard] Routing to:', path)
        
        setIsRedirecting(true)
        router.push(path)
      } catch (error: any) {
        console.error('[Dashboard] Error in checkUserRole:', error)
        
        // Handle refresh token errors
        if (isRefreshTokenError(error)) {
          console.log('[Dashboard] Refresh token error, clearing stale auth')
          await clearStaleAuth()
        }
        
        setIsRedirecting(true)
        router.push('/auth/login')
      }
    }

    checkUserRole()
  }, [router, isRedirecting])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
