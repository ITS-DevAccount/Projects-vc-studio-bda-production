/**
 * CTA Button Configuration Types
 * Separates button definition (what) from placement (where)
 */

// Button Definition Types
export type CTAVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type PlacementSection = 'hero' | 'body' | 'footer' | 'sidebar' | 'custom';

export interface CTAButton {
  id: string;
  app_uuid: string;
  label: string;
  href: string;
  variant: CTAVariant;
  icon_name?: string;
  analytics_event?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateCTAInput {
  label: string;
  href: string;
  variant?: CTAVariant;
  icon_name?: string;
  analytics_event?: string;
}

export interface UpdateCTAInput {
  label?: string;
  href?: string;
  variant?: CTAVariant;
  icon_name?: string;
  analytics_event?: string;
  is_active?: boolean;
}

// Placement Types
export interface PageCTAPlacement {
  id: string;
  page_settings_id: string;
  cta_button_id: string;
  section: PlacementSection;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePlacementInput {
  cta_button_id: string;
  section: PlacementSection;
  sort_order?: number;
}

// Combined Types (for rendering)
export interface CTAPlacementWithButton extends PageCTAPlacement {
  cta_button: CTAButton;
}

// API Response Types
export interface CTAButtonResponse {
  success: boolean;
  data?: CTAButton;
  error?: string;
}

export interface CTAListResponse {
  success: boolean;
  data?: CTAButton[];
  error?: string;
}

export interface PlacementListResponse {
  success: boolean;
  data?: CTAPlacementWithButton[];
  error?: string;
}

export interface PlacementResponse {
  success: boolean;
  data?: PageCTAPlacement;
  error?: string;
}
