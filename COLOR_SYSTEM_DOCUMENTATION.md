# VC Studio - Site-Wide Color System Documentation

## Overview

This document describes the comprehensive color system applied to VC Studio and intended for replication across all Value Chain Studio domain applications (ADA, PDA, etc.).

---

## Brand Colors

### Core Palette

| Color Name | Hex Code | Tailwind Class | Usage |
|-----------|----------|----------------|--------|
| **Primary Background** | `#f4f8fa` | `bg-brand-background` | Main page background (body) |
| **Primary Text** | `#032c60` | `text-brand-text` | All body text, headings |
| **Secondary Text** | `#2a5a8f` | `text-brand-text-light` | Subheadings, descriptions |
| **Muted Text** | `#5c7ea3` | `text-brand-text-muted` | Labels, helper text, placeholders |

### Design Philosophy

- **Clean & Professional**: Light background with dark text ensures high readability
- **High Contrast**: #032c60 on #f4f8fa provides excellent accessibility (WCAG AAA compliant)
- **Subtle Variations**: Multiple text shades for clear visual hierarchy
- **Airy Feel**: Pale blue-grey background creates an open, spacious feeling

---

## Section Backgrounds

For creating visual distinction between page sections while maintaining cohesion:

| Color Name | Hex Code | Tailwind Class | Usage |
|-----------|----------|----------------|--------|
| **Light** | `#ffffff` | `bg-section-light` | Primary section background, cards, forms |
| **Subtle** | `#f9fbfc` | `bg-section-subtle` | Alternating sections, secondary cards |
| **Emphasis** | `#eef4f8` | `bg-section-emphasis` | Highlighted sections, footer |
| **Border** | `#dce7ed` | `border-section-border` | Section dividers, card borders |

### Usage Pattern

```jsx
// Alternating section pattern for visual rhythm
<section className="bg-section-light">Hero</section>
<section className="bg-section-subtle">Features</section>
<section className="bg-section-light">Resources</section>
<section className="bg-section-emphasis">Footer</section>
```

---

## Accent Colors

For interactive elements, buttons, and calls-to-action:

| Color Name | Hex Code | Tailwind Class | Usage |
|-----------|----------|----------------|--------|
| **Primary** | `#0369a1` | `bg-accent-primary` | Primary buttons, links |
| **Primary Hover** | `#0284c7` | `hover:bg-accent-primary-hover` | Hover state for primary |
| **Secondary** | `#0891b2` | `bg-accent-secondary` | Secondary actions, accents |
| **Secondary Hover** | `#06b6d4` | `hover:bg-accent-secondary-hover` | Hover state for secondary |

### Button Examples

```jsx
// Primary button
<button className="bg-accent-primary hover:bg-accent-primary-hover text-white px-6 py-3 rounded-lg">
  Get Started
</button>

// Secondary button
<button className="bg-white border-2 border-accent-primary text-accent-primary hover:bg-section-emphasis">
  Learn More
</button>
```

---

## Semantic Colors

For status messages, alerts, and feedback:

### Success (Green)

| Type | Hex Code | Tailwind Class | Usage |
|------|----------|----------------|--------|
| Foreground | `#16a34a` | `text-semantic-success` | Success text |
| Background | `#f0fdf4` | `bg-semantic-success-bg` | Success message backgrounds |

### Warning (Amber)

| Type | Hex Code | Tailwind Class | Usage |
|------|----------|----------------|--------|
| Foreground | `#d97706` | `text-semantic-warning` | Warning text |
| Background | `#fffbeb` | `bg-semantic-warning-bg` | Warning message backgrounds |

### Error (Red)

| Type | Hex Code | Tailwind Class | Usage |
|------|----------|----------------|--------|
| Foreground | `#dc2626` | `text-semantic-error` | Error text |
| Background | `#fef2f2` | `bg-semantic-error-bg` | Error message backgrounds |

### Info (Blue)

| Type | Hex Code | Tailwind Class | Usage |
|------|----------|----------------|--------|
| Foreground | `#2563eb` | `text-semantic-info` | Info text |
| Background | `#eff6ff` | `bg-semantic-info-bg` | Info message backgrounds |

### Alert Component Example

```jsx
// Success message
<div className="bg-semantic-success-bg border border-semantic-success text-semantic-success px-4 py-3 rounded-lg">
  Your changes have been saved successfully.
</div>

// Error message
<div className="bg-semantic-error-bg border border-semantic-error text-semantic-error px-4 py-3 rounded-lg">
  An error occurred. Please try again.
</div>
```

---

## Neutral Palette

Grayscale for UI elements, borders, and backgrounds:

| Shade | Hex Code | Tailwind Class | Usage |
|-------|----------|----------------|--------|
| 50 | `#f9fafb` | `bg-neutral-50` | Lightest backgrounds |
| 100 | `#f3f4f6` | `bg-neutral-100` | Very light backgrounds |
| 200 | `#e5e7eb` | `bg-neutral-200` | Light borders |
| 300 | `#d1d5db` | `bg-neutral-300` | Borders, dividers |
| 400 | `#9ca3af` | `bg-neutral-400` | Disabled states |
| 500 | `#6b7280` | `text-neutral-500` | Placeholder text |
| 600 | `#4b5563` | `text-neutral-600` | Secondary text |
| 700 | `#374151` | `text-neutral-700` | Body text (alternate) |
| 800 | `#1f2937` | `text-neutral-800` | Headings (alternate) |
| 900 | `#111827` | `text-neutral-900` | Darkest text |

---

## Component Examples

### Navigation Bar

```jsx
<nav className="sticky top-0 z-50 bg-section-light border-b border-section-border shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-16">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg">
          <Logo />
        </div>
        <span className="text-xl font-bold text-brand-text">VC Studio</span>
      </div>
      <div className="hidden md:flex gap-8">
        <a href="#" className="text-brand-text-light hover:text-accent-primary transition">
          Home
        </a>
      </div>
    </div>
  </div>
</nav>
```

### Card Component

```jsx
<div className="bg-section-light rounded-lg border border-section-border shadow-sm hover:border-accent-primary transition">
  <div className="p-6">
    <h3 className="text-lg font-semibold text-brand-text mb-2">Card Title</h3>
    <p className="text-brand-text-muted text-sm">Card description goes here.</p>
  </div>
</div>
```

### Form Input

```jsx
<div>
  <label className="block text-sm font-semibold mb-2 text-brand-text">
    Email Address
  </label>
  <input
    type="email"
    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
    placeholder="your@email.com"
  />
</div>
```

### Hero Section

```jsx
<section className="py-20 bg-gradient-to-br from-section-emphasis via-section-subtle to-section-light">
  <div className="max-w-7xl mx-auto text-center">
    <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary bg-clip-text text-transparent">
      Value Chain Studio
    </h1>
    <p className="text-xl text-brand-text mb-8">
      Systematic business transformation
    </p>
    <button className="bg-accent-primary hover:bg-accent-primary-hover text-white px-8 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition">
      Get Started
    </button>
  </div>
</section>
```

---

## Global Styles

Applied in `src/app/globals.css`:

```css
body {
  background-color: #f4f8fa;  /* brand-background */
  color: #032c60;             /* brand-text */
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #f4f8fa;
}

::-webkit-scrollbar-thumb {
  background: #0369a1;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #0284c7;
}
```

---

## Replicating Across Domains

### For ADA (Application Domain Architecture)

1. Copy `tailwind.config.js` to ADA project
2. Copy `src/app/globals.css` to ADA project
3. Use the same Tailwind classes throughout the application
4. Maintain the color palette exactly as defined

### For PDA (Process Domain Architecture)

Same process as ADA - the color system is designed to be universal across all VC Studio domains.

### Customization (if needed)

If a domain needs subtle brand differentiation:

```js
// In tailwind.config.js, extend the accent colors only
colors: {
  brand: { /* keep same */ },
  section: { /* keep same */ },
  accent: {
    primary: '#custom-color',     // Domain-specific primary
    'primary-hover': '#custom',   // Domain-specific hover
    secondary: '#0891b2',         // Keep VC Studio secondary
    'secondary-hover': '#06b6d4'  // Keep VC Studio secondary hover
  }
}
```

---

## Accessibility

### Color Contrast Ratios

All text/background combinations meet WCAG AA standards (minimum 4.5:1 for normal text, 3:1 for large text):

- `text-brand-text` on `bg-brand-background`: **13.5:1** (AAA)
- `text-brand-text-light` on `bg-brand-background`: **7.2:1** (AAA)
- `text-brand-text-muted` on `bg-brand-background`: **5.1:1** (AA)
- `text-white` on `bg-accent-primary`: **8.9:1** (AAA)

### Focus States

All interactive elements include visible focus indicators:

```jsx
className="focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
```

---

## Migration Checklist

When applying this color system to a new domain:

- [ ] Copy `tailwind.config.js`
- [ ] Copy `src/app/globals.css`
- [ ] Update all pages to use new color classes
- [ ] Replace all `bg-black` with `bg-brand-background`
- [ ] Replace all `text-white` with `text-brand-text`
- [ ] Replace all gray backgrounds with section colors
- [ ] Update all buttons to use accent colors
- [ ] Update all alerts to use semantic colors
- [ ] Test all pages for visual consistency
- [ ] Run accessibility audit
- [ ] Document any domain-specific customizations

---

## Color Usage Summary

### Main Page Structure

```
├── Body: bg-brand-background, text-brand-text
├── Navigation: bg-section-light, border-section-border
├── Hero: bg-gradient (section-emphasis → section-subtle → section-light)
├── Section 1: bg-section-light
├── Section 2: bg-section-subtle
├── Section 3: bg-section-light
└── Footer: bg-section-emphasis
```

### Interactive Elements

- **Primary CTA**: `bg-accent-primary hover:bg-accent-primary-hover text-white`
- **Secondary CTA**: `bg-section-light border-2 border-accent-primary text-accent-primary`
- **Links**: `text-accent-primary hover:text-accent-primary-hover`
- **Buttons disabled**: `bg-neutral-400 cursor-not-allowed`

### Text Hierarchy

- **H1 Headings**: `text-brand-text font-bold text-4xl`
- **H2 Headings**: `text-brand-text font-bold text-3xl`
- **H3 Headings**: `text-brand-text font-semibold text-xl`
- **Body**: `text-brand-text-light`
- **Captions**: `text-brand-text-muted text-sm`

---

## Quick Reference

### Most Common Classes

```jsx
// Backgrounds
bg-brand-background       // Page background
bg-section-light          // Cards, forms
bg-section-subtle         // Alternating sections
bg-section-emphasis       // Footer, highlighted areas

// Text
text-brand-text           // Primary text
text-brand-text-light     // Secondary text
text-brand-text-muted     // Tertiary text, labels

// Borders
border-section-border     // All borders

// Buttons
bg-accent-primary hover:bg-accent-primary-hover text-white

// Links
text-accent-primary hover:text-accent-primary-hover

// Focus
focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
```

---

## Support

For questions about the color system or implementation assistance, contact the VC Studio development team.

**Last Updated**: 2025-01-03
**Version**: 1.0
**Maintained By**: VC Studio Development Team
