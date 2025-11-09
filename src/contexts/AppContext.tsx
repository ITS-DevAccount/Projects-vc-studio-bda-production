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
        // Get site_code from environment variable
        const siteCode = process.env.NEXT_PUBLIC_SITE_CODE || 'VC_STUDIO'

        // Try to query site_settings - use .maybeSingle() instead of .single() to handle no records
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .or(`site_code.eq.${siteCode},is_active.eq.true`)
          .limit(1)
          .maybeSingle() // Use maybeSingle() to return null if no record found instead of error

        if (error) {
          const supabaseError = error as PostgrestError
          console.error('Error loading app context from site_settings:',
            supabaseError?.message ?? 'Unknown error',
            {
              code: supabaseError?.code ?? 'unknown',
              details: supabaseError?.details ?? null
            }
          )

          // Try to get any record as fallback
          const { data: anyData, error: anyError } = await supabase
            .from('site_settings')
            .select('*')
            .or(`site_code.eq.${siteCode},is_active.eq.true`)
            .limit(1)
            .maybeSingle()
          
          if (!anyError && anyData) {
            let fallbackUuid = anyData.app_uuid || anyData.id || ''
            if (!fallbackUuid && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
              fallbackUuid = crypto.randomUUID()
            }
            console.log('Using fallback site_settings record:', anyData)
            setAppContext({
              app_uuid: fallbackUuid,
              site_code: anyData.site_code || siteCode,
              domain_code: anyData.domain_code || 'BDA',
              site_name: anyData.site_name || 'VC Studio',
              is_active_app: anyData.is_active_app !== undefined ? anyData.is_active_app : (anyData.is_active || true),
              isLoading: false,
            })
            return
          }
          
          // If still no data, use defaults
          console.warn('No site_settings found, using defaults. app_uuid will be empty.')
          setAppContext(prev => ({ ...prev, isLoading: false }))
          return
        }

        if (data) {
          // Support both old schema (is_active) and new schema (is_active_app, site_code, etc.)
          let appUuid = data.app_uuid || data.id || ''
          if (!appUuid && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            appUuid = crypto.randomUUID()
          }
          console.log('Loaded app context:', { app_uuid: appUuid, site_code: data.site_code || siteCode })
          setAppContext({
            app_uuid: appUuid,
            site_code: data.site_code || siteCode,
            domain_code: data.domain_code || 'BDA',
            site_name: data.site_name || 'VC Studio',
            is_active_app: data.is_active_app !== undefined ? data.is_active_app : (data.is_active || true),
            isLoading: false,
          })
        } else {
          // No record found
          console.warn('No active site_settings record found, using defaults. app_uuid will be empty.')
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
