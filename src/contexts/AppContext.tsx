'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
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

        // Check if multi-app fields exist by trying to query them
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('is_active', true)
          .single()

        if (error) {
          console.error('Error loading app context:', error)
          // Keep default values
          setAppContext(prev => ({ ...prev, isLoading: false }))
          return
        }

        if (data) {
          // Support both old schema (is_active) and new schema (is_active_app, site_code, etc.)
          setAppContext({
            app_uuid: data.app_uuid || data.id || '',
            site_code: data.site_code || siteCode,
            domain_code: data.domain_code || 'BDA',
            site_name: data.site_name || 'VC Studio',
            is_active_app: data.is_active_app !== undefined ? data.is_active_app : (data.is_active || true),
            isLoading: false,
          })
        }
      } catch (err) {
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
