'use client';

import { useTheme } from '@/hooks/useTheme';
import { Zap } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
  linkTo?: string;
  showTagline?: boolean;
}

/**
 * Logo Component
 *
 * Displays the site logo from site_settings configuration.
 * Falls back to icon + site name if no logo is configured.
 *
 * @param variant - Display variant: 'default' (full), 'compact' (smaller), 'icon-only'
 * @param className - Additional CSS classes
 * @param linkTo - URL to link to (default: '/')
 * @param showTagline - Whether to show tagline below logo
 */
export default function Logo({
  variant = 'default',
  className = '',
  linkTo = '/',
  showTagline = false,
}: LogoProps) {
  const { settings, loading } = useTheme();

  const textSizeClasses = {
    default: 'text-xl',
    compact: 'text-lg',
    'icon-only': 'hidden',
  };

  const LogoContent = () => {
    // Debug logging
    console.log('Logo Component - Settings:', {
      logo_url: settings.logo_url,
      logo_public_id: settings.logo_public_id,
      logo_width: settings.logo_width,
      logo_height: settings.logo_height,
    });

    // If loading, show placeholder
    if (loading) {
      return (
        <div className="flex items-center gap-2 animate-pulse">
          <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
          {variant !== 'icon-only' && (
            <div className="h-6 w-32 bg-gray-300 rounded"></div>
          )}
        </div>
      );
    }

    // If logo is configured (either full URL or base + public_id), use image
    if (settings.logo_public_id || settings.logo_url) {
      let logoSrc = '';

      // Clean up logo_url - remove common invalid values
      const cleanLogoUrl = settings.logo_url?.trim();
      const isValidBaseUrl = cleanLogoUrl &&
                             cleanLogoUrl.startsWith('http') &&
                             cleanLogoUrl.includes('cloudinary.com');

      // Option 1: Full URL in logo_public_id (PRIORITY - most common use case)
      if (settings.logo_public_id?.startsWith('http')) {
        logoSrc = settings.logo_public_id;
        console.log('Logo: Using full URL from logo_public_id:', logoSrc);
      }
      // Option 2: Base URL + Public ID (both must be valid Cloudinary URLs)
      else if (
        isValidBaseUrl &&
        settings.logo_public_id &&
        !settings.logo_public_id.startsWith('http')
      ) {
        logoSrc = `${cleanLogoUrl}/w_${settings.logo_width},h_${settings.logo_height},c_fit,q_auto,f_auto/${settings.logo_public_id}`;
        console.log('Logo: Constructed URL from base + ID:', logoSrc);
      }
      // Option 3: Just base URL that's a valid Cloudinary URL
      else if (isValidBaseUrl) {
        logoSrc = cleanLogoUrl;
        console.log('Logo: Using base URL:', logoSrc);
      } else {
        console.log('Logo: No valid URL found, using fallback. logo_url:', cleanLogoUrl, 'logo_public_id:', settings.logo_public_id);
      }

      // Only render image if we have a valid source
      if (logoSrc) {
        // Use configured dimensions, but allow variant to scale them proportionally
        const getDimensions = () => {
          if (variant === 'icon-only') {
            return { width: 40, height: 40 };
          }
          if (variant === 'compact') {
            // Compact is 2/3 of default size
            return {
              width: Math.round(settings.logo_width * 0.67),
              height: Math.round(settings.logo_height * 0.67),
            };
          }
          // Default: use configured dimensions
          return {
            width: settings.logo_width,
            height: settings.logo_height,
          };
        };

        const dimensions = getDimensions();

        return (
          <div className={`flex flex-col ${className}`}>
            <img
              src={logoSrc}
              alt={settings.site_name}
              className="object-contain"
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
              }}
              onError={() => {
                console.error('Logo failed to load:', logoSrc);
                console.error('Full settings:', settings);
              }}
              onLoad={() => {
                console.log('Logo loaded successfully:', logoSrc);
              }}
            />
            {showTagline && settings.site_tagline && variant !== 'icon-only' && (
              <p className="text-xs text-gray-600 mt-1 max-w-md">
                {settings.site_tagline}
              </p>
            )}
          </div>
        );
      } else {
        console.log('Logo: logoSrc is empty, showing fallback');
      }
    } else {
      console.log('Logo: No logo_public_id or logo_url set, showing fallback');
    }

    // Fallback: Icon + Site Name
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`${variant === 'icon-only' ? 'w-10 h-10' : 'w-8 h-8'} bg-gradient-to-br rounded-lg flex items-center justify-center shadow-md`}
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${settings.primary_color}, ${settings.secondary_color})`,
          }}
        >
          <Zap className="w-5 h-5 text-white" />
        </div>
        {variant !== 'icon-only' && (
          <div className="flex flex-col">
            <span
              className={`${textSizeClasses[variant]} font-bold`}
              style={{ color: settings.text_primary }}
            >
              {settings.site_name}
            </span>
            {showTagline && settings.site_tagline && (
              <p className="text-xs text-gray-600 max-w-md">
                {settings.site_tagline}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // If linkTo is provided, wrap in Link
  if (linkTo) {
    return (
      <Link href={linkTo} className="flex-shrink-0">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}
