'use client';

import React, { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider Component
 *
 * Wraps the application and applies theme CSS variables from site_settings.
 * Automatically updates when theme settings change in the database.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings, loading } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined' || loading) return;

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

    // Update favicon if configured
    if (settings.favicon_url) {
      const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (favicon) {
        favicon.href = settings.favicon_url;
      }
    }

    // Update document title
    if (settings.site_name) {
      const titleSuffix = document.title.includes(' - ')
        ? ' - ' + document.title.split(' - ')[1]
        : '';
      document.title = settings.site_name + titleSuffix;
    }
  }, [settings, loading]);

  return <>{children}</>;
}
