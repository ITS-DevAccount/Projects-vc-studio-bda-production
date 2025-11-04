'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface SiteSettings {
  id: string;
  site_name: string;
  site_tagline: string | null;
  logo_url: string | null;
  logo_public_id: string | null;
  logo_width: number;
  logo_height: number;
  favicon_url: string | null;
  primary_color: string;
  primary_hover: string;
  secondary_color: string;
  secondary_hover: string;
  background_color: string;
  background_subtle: string;
  section_light: string;
  section_subtle: string;
  section_emphasis: string;
  section_border: string;
  text_primary: string;
  text_secondary: string;
  text_muted: string;
  text_light: string;
  success_color: string;
  error_color: string;
  warning_color: string;
  info_color: string;
  font_heading: string;
  font_body: string;
  border_radius: string;
  is_active: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  id: '',
  site_name: 'VC Studio',
  site_tagline: 'Systematic business transformation through Value Chain Excellence Framework',
  logo_url: null,
  logo_public_id: null,
  logo_width: 180,
  logo_height: 60,
  favicon_url: null,
  primary_color: '#2563eb',
  primary_hover: '#1d4ed8',
  secondary_color: '#7c3aed',
  secondary_hover: '#6d28d9',
  background_color: '#ffffff',
  background_subtle: '#f9fafb',
  section_light: '#f3f4f6',
  section_subtle: '#e5e7eb',
  section_emphasis: '#1f2937',
  section_border: '#d1d5db',
  text_primary: '#111827',
  text_secondary: '#4b5563',
  text_muted: '#6b7280',
  text_light: '#9ca3af',
  success_color: '#10b981',
  error_color: '#ef4444',
  warning_color: '#f59e0b',
  info_color: '#3b82f6',
  font_heading: 'Inter, system-ui, sans-serif',
  font_body: 'Inter, system-ui, sans-serif',
  border_radius: '0.5rem',
  is_active: true,
};

/**
 * Hook to access site theme settings from database
 * Fetches active site_settings and provides theme configuration
 */
export function useTheme() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();

    // Subscribe to changes in site_settings
    const subscription = supabase
      .channel('site_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('site_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No active settings found, use defaults
          console.log('No active site settings found, using defaults');
          setSettings(DEFAULT_SETTINGS);
        } else {
          throw fetchError;
        }
      } else if (data) {
        setSettings(data as SiteSettings);
      }
    } catch (err) {
      console.error('Error fetching site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load theme settings');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = () => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    // Apply all color variables
    root.style.setProperty('--color-primary', settings.primary_color);
    root.style.setProperty('--color-primary-hover', settings.primary_hover);
    root.style.setProperty('--color-secondary', settings.secondary_color);
    root.style.setProperty('--color-secondary-hover', settings.secondary_hover);

    root.style.setProperty('--color-background', settings.background_color);
    root.style.setProperty('--color-background-subtle', settings.background_subtle);

    root.style.setProperty('--color-section-light', settings.section_light);
    root.style.setProperty('--color-section-subtle', settings.section_subtle);
    root.style.setProperty('--color-section-emphasis', settings.section_emphasis);
    root.style.setProperty('--color-section-border', settings.section_border);

    root.style.setProperty('--color-text-primary', settings.text_primary);
    root.style.setProperty('--color-text-secondary', settings.text_secondary);
    root.style.setProperty('--color-text-muted', settings.text_muted);
    root.style.setProperty('--color-text-light', settings.text_light);

    root.style.setProperty('--color-success', settings.success_color);
    root.style.setProperty('--color-error', settings.error_color);
    root.style.setProperty('--color-warning', settings.warning_color);
    root.style.setProperty('--color-info', settings.info_color);

    // Apply typography
    root.style.setProperty('--font-heading', settings.font_heading);
    root.style.setProperty('--font-body', settings.font_body);

    // Apply border radius
    root.style.setProperty('--border-radius', settings.border_radius);
  };

  // Apply theme whenever settings change
  useEffect(() => {
    applyTheme();
  }, [settings]);

  const refreshSettings = () => {
    fetchSettings();
  };

  return {
    settings,
    loading,
    error,
    refreshSettings,
    applyTheme,
  };
}
