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
        const appCode = process.env.NEXT_PUBLIC_SITE_CODE || 'VC_STUDIO'

        // Query applications table to get app context
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('app_code', appCode)
          .eq('is_active', true)
          .maybeSingle()

        if (error) {
          const supabaseError = error as PostgrestError
          console.error('Error loading app context from applications:',
            supabaseError?.message ?? 'Unknown error',
            {
              code: supabaseError?.code ?? 'unknown',
              details: supabaseError?.details ?? null
            }
          )

          // Try to get any active record as fallback
          const { data: anyData, error: anyError } = await supabase
            .from('applications')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

          if (!anyError && anyData) {
            console.log('Using fallback applications record:', anyData)
            setAppContext({
              app_uuid: anyData.id,
              site_code: anyData.app_code,
              domain_code: anyData.domain_type || 'BDA',
              site_name: anyData.app_name || 'VC Studio',
              is_active_app: anyData.is_active || true,
              isLoading: false,
            })
            return
          }

          // If still no data, use defaults
          console.warn('No applications found, using defaults. app_uuid will be empty.')
          setAppContext(prev => ({ ...prev, isLoading: false }))
          return
        }

        if (data) {
          console.log('Loaded app context:', { app_uuid: data.id, app_code: data.app_code })
          setAppContext({
            app_uuid: data.id,
            site_code: data.app_code,
            domain_code: data.domain_type || 'BDA',
            site_name: data.app_name || 'VC Studio',
            is_active_app: data.is_active || true,
            isLoading: false,
          })
        } else {
          // No record found
          console.warn('No active application record found for app_code:', appCode)
          setAppContext(prev => ({ ...prev, isLoading: false }))
        }
      } catch (err: any) {
        console.error('Failed to load app context:', err)
        setAppContext(prev => ({ ...prev, isLoading: false }))
      }
    }

    loadAppContext()
  }, [])

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
