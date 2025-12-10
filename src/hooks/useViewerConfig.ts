'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ViewerConfig {
  [key: string]: any; // Config is flexible JSONB from database
  componentName?: string;
}

export interface UseViewerConfigResult {
  config: ViewerConfig | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch viewer configuration from components_registry table
 * 
 * @param viewerCode - The viewer code (component_code) to fetch config for
 * @returns { config, loading, error }
 */
export function useViewerConfig(viewerCode: string | null | undefined): UseViewerConfigResult {
  const [config, setConfig] = useState<ViewerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch if no viewer code provided
    if (!viewerCode) {
      setConfig(null);
      setLoading(false);
      setError(null);
      return;
    }

    async function fetchConfig() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('components_registry')
          .select('default_params, widget_component_name')
          .eq('component_code', viewerCode)
          .eq('registry_type', 'AI_VIEWER')
          .eq('is_active', true)
          .single();

        if (fetchError) {
          // If not found, that's okay - we'll use default config
          if (fetchError.code === 'PGRST116') {
            console.warn(`Viewer config not found for code: ${viewerCode}`);
            setConfig(null);
          } else {
            console.error('Error fetching viewer config:', fetchError);
            setError(fetchError.message);
          }
        } else if (data) {
          // Merge default_params with component name
          setConfig({
            ...(data.default_params || {}),
            componentName: data.widget_component_name
          });
        } else {
          setConfig(null);
        }
      } catch (err) {
        console.error('Unexpected error fetching viewer config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [viewerCode]);

  return { config, loading, error };
}











