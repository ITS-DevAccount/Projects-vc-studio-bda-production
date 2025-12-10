'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CTAButton as CTAButtonType } from '@/lib/types/cta';

interface CTAButtonProps {
  id: string;
  className?: string;
  onClick?: () => void;
}

/**
 * CTAButton Component
 * Fetches and renders a CTA button from the database by ID
 * Reusable across web pages, email templates, PDFs, and future interfaces
 */
export function CTAButton({ id, className = '', onClick }: CTAButtonProps) {
  const [button, setButton] = useState<CTAButtonType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchButton = async () => {
      try {
        const response = await fetch(`/api/cta-buttons/${id}`);
        const result = await response.json();

        if (result.success) {
          setButton(result.data);
        } else {
          setError(result.error || 'Failed to load button');
        }
      } catch (err) {
        setError('Failed to load button');
        console.error('[CTAButton Fetch Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchButton();
  }, [id]);

  if (loading) {
    return <div className={`animate-pulse h-10 bg-gray-200 rounded ${className}`} />;
  }

  if (error || !button) {
    return null;
  }

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400',
    outline:
      'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    ghost: 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
  };

  const baseStyles =
    'inline-flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantStyle =
    variantStyles[button.variant as keyof typeof variantStyles] ||
    variantStyles.primary;
  const combinedClassName = `${baseStyles} ${variantStyle} ${className}`;

  const handleClick = () => {
    if (button.analytics_event) {
      // Track analytics event here (e.g., Posthog, Segment)
      console.log('[Analytics]:', button.analytics_event);
      // Example: posthog.capture(button.analytics_event, { button_id: id, label: button.label });
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <Link href={button.href} className={combinedClassName} onClick={handleClick}>
      {button.icon_name && (
        <span className="text-lg" aria-hidden="true">
          {getIconByName(button.icon_name)}
        </span>
      )}
      {button.label}
    </Link>
  );
}

/**
 * Helper to map icon names to React elements
 * Adjust based on your icon library (e.g., Heroicons, Lucide, etc.)
 */
function getIconByName(iconName: string): JSX.Element | null {
  const icons: { [key: string]: string } = {
    'arrow-right': '→',
    'arrow-left': '←',
    check: '✓',
    plus: '+',
    download: '⬇',
    upload: '⬆',
    external: '↗',
    info: 'ℹ',
    warning: '⚠',
    'x': '✕',
  };

  return <span>{icons[iconName] || ''}</span>;
}
