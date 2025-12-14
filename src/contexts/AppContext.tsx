'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export interface AppContextType {
  app_uuid: string
  site_code: string
  domain_code: string
  site_name: string
  is_active_app: boolean
  isLoading: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [appContext, setAppContext] = useState<AppContextType>({
    app_uuid: '',
    site_code: 'VC_STUDIO', // Default fallback
    domain_code: 'BDA',
    site_name: 'VC Studio',
    is_active_app: true,
    isLoading: true,
  })

  useEffect(() => {
    async function loadAppContext() {
      try {
        // Get app_code from environment variable
        const appCode = process.env.NEXT_PUBLIC_APP_CODE || 'VC_STUDIO'
        
        console.log('🔍 Loading app context for app_code:', appCode)

        // Query applications table: SELECT id as app_uuid FROM applications WHERE app_code = $1 LIMIT 1
        const { data, error } = await supabase
          .from('applications')
          .select('id, app_code, app_name')
          .eq('app_code', appCode)
          .limit(1)
          .maybeSingle()
        
        console.log('📊 Applications query result:', { 
          hasData: !!data, 
          hasError: !!error,
          app_uuid: data?.id,
          app_code: data?.app_code,
          errorMessage: error?.message 
        })

        if (error) {
          const supabaseError = error as PostgrestError
          console.error('Error loading app context from applications:',
            supabaseError?.message ?? 'Unknown error',
            {
              code: supabaseError?.code ?? 'unknown',
              details: supabaseError?.details ?? null,
              appCode
            }
          )

          // CRITICAL: Do NOT use fallback - fail gracefully instead
          // Fallback could pick wrong app_uuid (e.g., BuildBid instead of VC Studio)
          console.error('Failed to load app context. app_uuid will be empty. Check NEXT_PUBLIC_APP_CODE and database connection.')
          setAppContext(prev => ({ ...prev, isLoading: false }))
          return
        }

        if (data) {
          console.log('Loaded app context:', { app_uuid: data.id, app_code: data.app_code })
          setAppContext({
            app_uuid: data.id,
            site_code: data.app_code,
            domain_code: 'BDA',
            site_name: data.app_name || 'VC Studio',
            is_active_app: true,
            isLoading: false,
          })
        } else {
          // No record found
          console.warn('No application record found for app_code:', appCode)
          setAppContext(prev => ({ ...prev, isLoading: false }))
        }
      } catch (err: any) {
        console.error('Failed to load app context:', err)
        setAppContext(prev => ({ ...prev, isLoading: false }))
      }
    }

    loadAppContext()
  }, [])

  // Show loading screen while initializing app_uuid
  if (appContext.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading application...</p>
        </div>
      </div>
    )
  }

  // Show error state if app_uuid is empty after loading
  if (!appContext.app_uuid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Application Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Failed to initialize application context. Please check your NEXT_PUBLIC_APP_CODE environment variable.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Expected app_code: {process.env.NEXT_PUBLIC_APP_CODE || 'VC_STUDIO'}
          </p>
        </div>
      </div>
    )
  }

  return <AppContext.Provider value={appContext}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

// Convenience hook to just get app_uuid
export function useAppUuid() {
  const { app_uuid } = useApp()
  return app_uuid
}
