/**
 * VC Studio - Brand Color System
 *
 * This color palette is designed for consistency across all Value Chain Studio domain apps:
 * - VC Studio (main)
 * - ADA (Application Domain Architecture)
 * - PDA (Process Domain Architecture)
 *
 * BRAND COLORS:
 * - Primary Background: #f4f8fa (pale blue-grey) - Main page background
 * - Primary Text: #032c60 (dark blue) - All body text for readability
 *
 * COLOR PHILOSOPHY:
 * - Clean, professional appearance
 * - High contrast for accessibility
 * - Subtle variations for visual hierarchy
 * - Light, airy feel with strategic use of darker accents
 *
 * USAGE GUIDELINES:
 * - bg-primary: Main page background (#f4f8fa)
 * - text-primary: All body text (#032c60)
 * - bg-section-light: Alternating section background (white)
 * - bg-section-subtle: Alternating section background (very light blue)
 * - bg-accent: Buttons, CTAs, highlights (derived from primary)
 */

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors - Core palette (using CSS variables from theme system)
        brand: {
          background: 'var(--color-background, #f4f8fa)',    // From theme or fallback
          text: 'var(--color-text-primary, #032c60)',          // From theme or fallback
          'text-light': 'var(--color-text-light, #2a5a8f)',  // From theme or fallback
          'text-muted': 'var(--color-text-muted, #5c7ea3)',  // From theme or fallback
        },

        // Section Backgrounds - For visual hierarchy (using CSS variables)
        section: {
          light: 'var(--color-section-light, #ffffff)',         // From theme or fallback
          subtle: 'var(--color-section-subtle, #f9fbfc)',        // From theme or fallback
          emphasis: 'var(--color-section-emphasis, #eef4f8)',      // From theme or fallback
          border: 'var(--color-section-border, #dce7ed)',        // From theme or fallback
        },

        // Accent Colors - Interactive elements (using CSS variables from theme system)
        accent: {
          primary: 'var(--color-primary, #0369a1)',       // From theme or fallback
          'primary-hover': 'var(--color-primary-hover, #0284c7)', // From theme or fallback
          secondary: 'var(--color-secondary, #0891b2)',     // From theme or fallback
          'secondary-hover': 'var(--color-secondary-hover, #06b6d4)', // From theme or fallback
        },

        // Semantic Colors - Status and feedback (using CSS variables)
        semantic: {
          success: 'var(--color-success, #16a34a)',       // From theme or fallback
          'success-bg': 'var(--color-success-bg, #f0fdf4)',  // Light green background (computed)
          warning: 'var(--color-warning, #d97706)',       // From theme or fallback
          'warning-bg': 'var(--color-warning-bg, #fffbeb)',  // Light amber background (computed)
          error: 'var(--color-error, #dc2626)',         // From theme or fallback
          'error-bg': 'var(--color-error-bg, #fef2f2)',    // Light red background (computed)
          info: 'var(--color-info, #2563eb)',          // From theme or fallback
          'info-bg': 'var(--color-info-bg, #eff6ff)',     // Light blue background (computed)
        },

        // Neutral Palette - Grayscale based on brand colors
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },

        // Override default blue colors to use theme CSS variables
        // This makes bg-blue-600, text-blue-600, etc. use theme colors
        blue: {
          50: 'var(--color-info-bg, #eff6ff)',
          100: 'var(--color-info-bg, #dbeafe)',
          200: 'var(--color-info-bg, #bfdbfe)',
          300: 'var(--color-info, #93c5fd)',
          400: 'var(--color-info, #60a5fa)',
          500: 'var(--color-primary, #3b82f6)',
          600: 'var(--color-primary, #2563eb)',  // Most common - maps to primary
          700: 'var(--color-primary-hover, #1d4ed8)',  // Hover state
          800: 'var(--color-primary-hover, #1e40af)',
          900: 'var(--color-primary, #1e3a8a)',
        },

        // Override purple colors to use secondary theme color
        purple: {
          50: 'var(--color-secondary, #faf5ff)',
          100: 'var(--color-secondary, #f3e8ff)',
          200: 'var(--color-secondary, #e9d5ff)',
          300: 'var(--color-secondary, #d8b4fe)',
          400: 'var(--color-secondary, #c084fc)',
          500: 'var(--color-secondary, #a855f7)',
          600: 'var(--color-secondary, #9333ea)',  // Most common - maps to secondary
          700: 'var(--color-secondary-hover, #7e22ce)',
          800: 'var(--color-secondary-hover, #6b21a8)',
          900: 'var(--color-secondary, #581c87)',
        },

        // Override indigo colors to use primary theme color
        indigo: {
          50: 'var(--color-primary, #eef2ff)',
          100: 'var(--color-primary, #e0e7ff)',
          200: 'var(--color-primary, #c7d2fe)',
          300: 'var(--color-primary, #a5b4fc)',
          400: 'var(--color-primary, #818cf8)',
          500: 'var(--color-primary, #6366f1)',
          600: 'var(--color-primary, #4f46e5)',  // Maps to primary
          700: 'var(--color-primary-hover, #4338ca)',
          800: 'var(--color-primary-hover, #3730a3)',
          900: 'var(--color-primary, #312e81)',
        },
      },

      // Typography extensions
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },

      // Spacing for consistent layout
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },

      // Border radius for consistent rounded corners
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
