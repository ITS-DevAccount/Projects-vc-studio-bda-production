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
        // Brand Colors - Core palette
        brand: {
          background: '#f4f8fa',    // Pale blue-grey - main background
          text: '#032c60',          // Dark blue - primary text
          'text-light': '#2a5a8f',  // Lighter blue - secondary text
          'text-muted': '#5c7ea3',  // Muted blue - tertiary text/labels
        },

        // Section Backgrounds - For visual hierarchy
        section: {
          light: '#ffffff',         // Pure white - alternating sections
          subtle: '#f9fbfc',        // Very light blue tint - alternating sections
          emphasis: '#eef4f8',      // Light blue - emphasized sections
          border: '#dce7ed',        // Border color for sections
        },

        // Accent Colors - Interactive elements
        accent: {
          primary: '#0369a1',       // Strong blue - primary buttons, links
          'primary-hover': '#0284c7', // Hover state for primary
          secondary: '#0891b2',     // Teal - secondary actions
          'secondary-hover': '#06b6d4', // Hover state for secondary
        },

        // Semantic Colors - Status and feedback
        semantic: {
          success: '#16a34a',       // Green - success states
          'success-bg': '#f0fdf4',  // Light green background
          warning: '#d97706',       // Amber - warnings
          'warning-bg': '#fffbeb',  // Light amber background
          error: '#dc2626',         // Red - errors
          'error-bg': '#fef2f2',    // Light red background
          info: '#2563eb',          // Blue - info messages
          'info-bg': '#eff6ff',     // Light blue background
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
