-- =====================================================
-- CTA Buttons Configuration System
-- Created: 2025-12-09
-- Purpose: Database-driven CTA button system with strict
--          separation between button definition (what)
--          and placement (where)
-- =====================================================

-- =====================================================
-- 1. CREATE CTA_BUTTONS TABLE (Button Definitions)
-- =====================================================

CREATE TABLE IF NOT EXISTS cta_buttons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_uuid uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'primary',
  icon_name TEXT,
  analytics_event TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT cta_buttons_unique_label_per_app UNIQUE(app_uuid, label),
  CONSTRAINT valid_variant CHECK(variant IN ('primary', 'secondary', 'outline', 'ghost'))
);

-- Create indexes for performance
CREATE INDEX idx_cta_buttons_app_uuid ON cta_buttons(app_uuid);
CREATE INDEX idx_cta_buttons_is_active ON cta_buttons(is_active);
CREATE INDEX idx_cta_buttons_created_at ON cta_buttons(created_at DESC);

-- Add comment
COMMENT ON TABLE cta_buttons IS 'Stores CTA button definitions - the "what" (label, href, styling)';

-- =====================================================
-- 2. ENABLE RLS ON CTA_BUTTONS
-- =====================================================

ALTER TABLE cta_buttons ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin-only read access
CREATE POLICY "Admin can read CTA buttons"
  ON cta_buttons FOR SELECT
  USING (is_user_admin());

-- RLS Policy: Admin-only insert
CREATE POLICY "Admin can create CTA buttons"
  ON cta_buttons FOR INSERT
  WITH CHECK (is_user_admin());

-- RLS Policy: Admin-only update
CREATE POLICY "Admin can update CTA buttons"
  ON cta_buttons FOR UPDATE
  USING (is_user_admin());

-- RLS Policy: Admin-only delete
CREATE POLICY "Admin can delete CTA buttons"
  ON cta_buttons FOR DELETE
  USING (is_user_admin());

-- =====================================================
-- 3. CREATE PAGE_CTA_PLACEMENTS TABLE (Button Placement)
-- =====================================================

CREATE TABLE IF NOT EXISTS page_cta_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_settings_id uuid NOT NULL REFERENCES page_settings(id) ON DELETE CASCADE,
  cta_button_id uuid NOT NULL REFERENCES cta_buttons(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT page_cta_placements_unique_per_section UNIQUE(page_settings_id, section, sort_order),
  CONSTRAINT valid_section CHECK(section IN ('hero', 'body', 'footer', 'sidebar', 'custom'))
);

-- Create indexes for performance
CREATE INDEX idx_page_cta_placements_page_settings_id ON page_cta_placements(page_settings_id);
CREATE INDEX idx_page_cta_placements_cta_button_id ON page_cta_placements(cta_button_id);
CREATE INDEX idx_page_cta_placements_section ON page_cta_placements(section);

-- Add comment
COMMENT ON TABLE page_cta_placements IS 'Stores CTA button placements - the "where" (which page, which section, sort order)';

-- =====================================================
-- 4. ENABLE RLS ON PAGE_CTA_PLACEMENTS
-- =====================================================

ALTER TABLE page_cta_placements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can read placements
CREATE POLICY "Authenticated users can read CTA placements"
  ON page_cta_placements FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policy: Admin-only insert
CREATE POLICY "Admin can create CTA placements"
  ON page_cta_placements FOR INSERT
  WITH CHECK (is_user_admin());

-- RLS Policy: Admin-only update
CREATE POLICY "Admin can update CTA placements"
  ON page_cta_placements FOR UPDATE
  USING (is_user_admin());

-- RLS Policy: Admin-only delete
CREATE POLICY "Admin can delete CTA placements"
  ON page_cta_placements FOR DELETE
  USING (is_user_admin());

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get CTAs for a page with placement data
CREATE OR REPLACE FUNCTION get_page_cta_placements(page_settings_id_param uuid)
RETURNS TABLE (
  placement_id uuid,
  cta_button_id uuid,
  label TEXT,
  href TEXT,
  variant TEXT,
  icon_name TEXT,
  section TEXT,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pcp.id,
    pcp.cta_button_id,
    cb.label,
    cb.href,
    cb.variant,
    cb.icon_name,
    pcp.section,
    pcp.sort_order
  FROM page_cta_placements pcp
  JOIN cta_buttons cb ON pcp.cta_button_id = cb.id
  WHERE pcp.page_settings_id = page_settings_id_param AND cb.is_active = TRUE
  ORDER BY pcp.section, pcp.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get CTA button by ID
CREATE OR REPLACE FUNCTION get_cta_button_by_id(button_id uuid)
RETURNS TABLE (
  id uuid,
  label TEXT,
  href TEXT,
  variant TEXT,
  icon_name TEXT,
  analytics_event TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cta_buttons.id,
    cta_buttons.label,
    cta_buttons.href,
    cta_buttons.variant,
    cta_buttons.icon_name,
    cta_buttons.analytics_event
  FROM cta_buttons
  WHERE cta_buttons.id = button_id AND cta_buttons.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for cta_buttons
CREATE TRIGGER update_cta_buttons_updated_at
  BEFORE UPDATE ON cta_buttons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for page_cta_placements
CREATE TRIGGER update_page_cta_placements_updated_at
  BEFORE UPDATE ON page_cta_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
