-- FLM Component Suite - Phase 1: FLM Data Model
-- File: 20260111_162612_create_flm_data_model.sql
-- Purpose: Create database tables for VC Models and FLM models/artefacts with versioning and collaboration
-- Dependencies: applications table, stakeholders table, nodes table (file system)

-- =============================================================================
-- STEP 1: Create VC Models table (Parent Container)
-- =============================================================================

CREATE TABLE IF NOT EXISTS vc_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code TEXT NOT NULL,
  
  -- Ownership
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  app_uuid UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Versioning
  is_current_version BOOLEAN DEFAULT true,
  version_number INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES vc_models(id), -- Links to previous version
  
  -- State
  status TEXT DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
  
  -- Metadata
  model_name TEXT NOT NULL,
  description TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- STEP 2: Create VC Model Collaborators table
-- =============================================================================

CREATE TABLE IF NOT EXISTS vc_model_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_model_id UUID NOT NULL REFERENCES vc_models(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'COLLABORATOR' CHECK (role IN ('OWNER', 'COLLABORATOR', 'REVIEWER', 'VIEWER')),
  permissions JSONB DEFAULT '{"can_edit": true, "can_approve": false, "can_delete": false}'::jsonb,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(vc_model_id, stakeholder_id)
);

-- =============================================================================
-- STEP 3: Create FLM Models table (Component of VC Model)
-- =============================================================================

CREATE TABLE IF NOT EXISTS flm_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent relationship
  vc_model_id UUID NOT NULL REFERENCES vc_models(id) ON DELETE CASCADE,
  
  -- State tracking
  status TEXT DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
  current_step TEXT CHECK (current_step IN ('BVS', 'L0', 'L1', 'L2', 'BLUEPRINT')),
  
  -- Version tracking (within VC Model)
  flm_version INTEGER DEFAULT 1,
  
  -- Metadata
  description TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One FLM per VC Model version
  UNIQUE(vc_model_id, flm_version)
);

-- =============================================================================
-- STEP 4: Create FLM Artefacts table (stores JSON outputs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS flm_artefacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flm_model_id UUID NOT NULL REFERENCES flm_models(id) ON DELETE CASCADE,
  artefact_type TEXT NOT NULL CHECK (artefact_type IN ('BVS', 'L0', 'L1', 'L2', 'BLUEPRINT')),
  
  -- JSON storage (source of truth)
  artefact_json JSONB NOT NULL,
  
  -- State
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'CONFIRMED', 'SUPERSEDED')),
  version INTEGER DEFAULT 1,
  
  -- Document generation
  document_path TEXT, -- Path in nodes table or storage
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(flm_model_id, artefact_type, version)
);

-- =============================================================================
-- STEP 5: Create FLM Source Documents table
-- =============================================================================

CREATE TABLE IF NOT EXISTS flm_source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flm_model_id UUID NOT NULL REFERENCES flm_models(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL, -- Reference to nodes table
  document_type TEXT, -- 'business_plan', 'financial_model', 'market_research', etc.
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- STEP 6: Create Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_vc_models_stakeholder ON vc_models(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_vc_models_status ON vc_models(status);
CREATE INDEX IF NOT EXISTS idx_vc_models_app_uuid ON vc_models(app_uuid);
CREATE INDEX IF NOT EXISTS idx_vc_models_model_code ON vc_models(model_code);
CREATE INDEX IF NOT EXISTS idx_vc_models_current_version ON vc_models(is_current_version) WHERE is_current_version = true;

-- Unique partial index: Ensure only one current version per model_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_vc_models_unique_current_version 
  ON vc_models(model_code) 
  WHERE is_current_version = true;
CREATE INDEX IF NOT EXISTS idx_vc_model_collaborators_stakeholder ON vc_model_collaborators(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_vc_model_collaborators_vc_model ON vc_model_collaborators(vc_model_id);
CREATE INDEX IF NOT EXISTS idx_flm_models_vc_model ON flm_models(vc_model_id);
CREATE INDEX IF NOT EXISTS idx_flm_models_status ON flm_models(status);
CREATE INDEX IF NOT EXISTS idx_flm_artefacts_model ON flm_artefacts(flm_model_id);
CREATE INDEX IF NOT EXISTS idx_flm_artefacts_type_status ON flm_artefacts(artefact_type, status);

-- =============================================================================
-- STEP 7: Enable RLS
-- =============================================================================

ALTER TABLE vc_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE vc_model_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE flm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE flm_artefacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE flm_source_documents ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 8: RLS Policies for vc_models
-- =============================================================================

-- Owner access (stakeholder owns the VC Model)
CREATE POLICY vc_models_owner_access ON vc_models
  FOR ALL
  USING (
    stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
  );

-- Collaborator access (via vc_model_collaborators)
CREATE POLICY vc_models_collaborator_access ON vc_models
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vc_model_collaborators vmc
      JOIN stakeholders s ON s.id = vmc.stakeholder_id
      WHERE vmc.vc_model_id = vc_models.id
      AND s.auth_user_id = auth.uid()
    )
  );

-- Collaborator can update if they have edit permissions
CREATE POLICY vc_models_collaborator_update ON vc_models
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM vc_model_collaborators vmc
      JOIN stakeholders s ON s.id = vmc.stakeholder_id
      WHERE vmc.vc_model_id = vc_models.id
      AND s.auth_user_id = auth.uid()
      AND (vmc.permissions->>'can_edit')::boolean = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vc_model_collaborators vmc
      JOIN stakeholders s ON s.id = vmc.stakeholder_id
      WHERE vmc.vc_model_id = vc_models.id
      AND s.auth_user_id = auth.uid()
      AND (vmc.permissions->>'can_edit')::boolean = true
    )
  );

-- =============================================================================
-- STEP 9: RLS Policies for vc_model_collaborators
-- =============================================================================

-- Can see collaborators if you have access to the VC Model
CREATE POLICY vc_model_collaborators_access ON vc_model_collaborators
  FOR SELECT
  USING (
    -- Owner access
    EXISTS (
      SELECT 1 FROM vc_models vm
      JOIN stakeholders s ON s.id = vm.stakeholder_id
      WHERE vm.id = vc_model_collaborators.vc_model_id
      AND s.auth_user_id = auth.uid()
    )
    -- OR collaborator access
    OR EXISTS (
      SELECT 1 FROM vc_model_collaborators vmc
      JOIN stakeholders s ON s.id = vmc.stakeholder_id
      WHERE vmc.vc_model_id = vc_model_collaborators.vc_model_id
      AND s.auth_user_id = auth.uid()
    )
  );

-- Owners can manage collaborators
CREATE POLICY vc_model_collaborators_owner_manage ON vc_model_collaborators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vc_models vm
      JOIN stakeholders s ON s.id = vm.stakeholder_id
      WHERE vm.id = vc_model_collaborators.vc_model_id
      AND s.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vc_models vm
      JOIN stakeholders s ON s.id = vm.stakeholder_id
      WHERE vm.id = vc_model_collaborators.vc_model_id
      AND s.auth_user_id = auth.uid()
    )
  );

-- =============================================================================
-- STEP 10: RLS Policies for flm_models (inherits access from parent vc_model)
-- =============================================================================

CREATE POLICY flm_models_vc_model_access ON flm_models
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vc_models vm
      WHERE vm.id = flm_models.vc_model_id
      AND (
        -- Owner access
        vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
        -- OR collaborator access
        OR EXISTS (
          SELECT 1 FROM vc_model_collaborators vmc
          JOIN stakeholders s ON s.id = vmc.stakeholder_id
          WHERE vmc.vc_model_id = vm.id
          AND s.auth_user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vc_models vm
      WHERE vm.id = flm_models.vc_model_id
      AND (
        -- Owner access
        vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
        -- OR collaborator access with edit permissions
        OR EXISTS (
          SELECT 1 FROM vc_model_collaborators vmc
          JOIN stakeholders s ON s.id = vmc.stakeholder_id
          WHERE vmc.vc_model_id = vm.id
          AND s.auth_user_id = auth.uid()
          AND (vmc.permissions->>'can_edit')::boolean = true
        )
      )
    )
  );

-- =============================================================================
-- STEP 11: RLS Policies for flm_artefacts (inherits from flm_models → vc_models)
-- =============================================================================

CREATE POLICY flm_artefacts_access ON flm_artefacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flm_models fm
      JOIN vc_models vm ON vm.id = fm.vc_model_id
      WHERE fm.id = flm_artefacts.flm_model_id
      AND (
        -- Owner access
        vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
        -- OR collaborator access
        OR EXISTS (
          SELECT 1 FROM vc_model_collaborators vmc
          JOIN stakeholders s ON s.id = vmc.stakeholder_id
          WHERE vmc.vc_model_id = vm.id
          AND s.auth_user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flm_models fm
      JOIN vc_models vm ON vm.id = fm.vc_model_id
      WHERE fm.id = flm_artefacts.flm_model_id
      AND (
        -- Owner access
        vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
        -- OR collaborator access with edit permissions
        OR EXISTS (
          SELECT 1 FROM vc_model_collaborators vmc
          JOIN stakeholders s ON s.id = vmc.stakeholder_id
          WHERE vmc.vc_model_id = vm.id
          AND s.auth_user_id = auth.uid()
          AND (vmc.permissions->>'can_edit')::boolean = true
        )
      )
    )
  );

-- =============================================================================
-- STEP 12: RLS Policies for flm_source_documents
-- =============================================================================

CREATE POLICY flm_source_documents_access ON flm_source_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flm_models fm
      JOIN vc_models vm ON vm.id = fm.vc_model_id
      WHERE fm.id = flm_source_documents.flm_model_id
      AND (
        -- Owner access
        vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
        -- OR collaborator access
        OR EXISTS (
          SELECT 1 FROM vc_model_collaborators vmc
          JOIN stakeholders s ON s.id = vmc.stakeholder_id
          WHERE vmc.vc_model_id = vm.id
          AND s.auth_user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flm_models fm
      JOIN vc_models vm ON vm.id = fm.vc_model_id
      WHERE fm.id = flm_source_documents.flm_model_id
      AND (
        -- Owner access
        vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
        -- OR collaborator access with edit permissions
        OR EXISTS (
          SELECT 1 FROM vc_model_collaborators vmc
          JOIN stakeholders s ON s.id = vmc.stakeholder_id
          WHERE vmc.vc_model_id = vm.id
          AND s.auth_user_id = auth.uid()
          AND (vmc.permissions->>'can_edit')::boolean = true
        )
      )
    )
  );

-- =============================================================================
-- STEP 13: Create sequence for generating model codes
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS vc_model_sequence START 1;

-- =============================================================================
-- STEP 14: Create database functions
-- =============================================================================

-- Function to create new VC Model
CREATE OR REPLACE FUNCTION create_vc_model(
  p_stakeholder_id UUID,
  p_model_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_app_uuid UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_model_id UUID;
  v_model_code TEXT;
  v_app_uuid UUID;
  v_stakeholder_owner_id UUID;
BEGIN
  -- Get app_uuid (use provided or get from applications table)
  IF p_app_uuid IS NULL THEN
    SELECT id INTO v_app_uuid FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1;
    IF v_app_uuid IS NULL THEN
      RAISE EXCEPTION 'VC_STUDIO application not found';
    END IF;
  ELSE
    v_app_uuid := p_app_uuid;
  END IF;
  
  -- Get stakeholder owner ID for current user
  SELECT id INTO v_stakeholder_owner_id FROM stakeholders WHERE auth_user_id = auth.uid() LIMIT 1;
  
  -- Generate unique model code
  v_model_code := 'VC-' || to_char(NOW(), 'YYYY') || '-' || 
                  LPAD(nextval('vc_model_sequence')::text, 4, '0');
  
  -- Insert VC model
  INSERT INTO vc_models (
    model_code,
    stakeholder_id,
    app_uuid,
    model_name,
    description,
    status,
    is_current_version,
    version_number,
    created_by
  ) VALUES (
    v_model_code,
    p_stakeholder_id,
    v_app_uuid,
    p_model_name,
    p_description,
    'INITIATED',
    true,
    1,
    auth.uid()
  ) RETURNING id INTO v_model_id;
  
  -- Add creator as owner in collaborators
  INSERT INTO vc_model_collaborators (
    vc_model_id,
    stakeholder_id,
    role,
    permissions,
    added_by
  ) VALUES (
    v_model_id,
    p_stakeholder_id,
    'OWNER',
    '{"can_edit": true, "can_approve": true, "can_delete": true}'::jsonb,
    auth.uid()
  );
  
  -- Create root directory in nodes table (file system)
  INSERT INTO nodes (
    name,
    type,
    owner_id,
    app_uuid,
    file_storage_path
  ) VALUES (
    v_model_code,
    'folder',
    p_stakeholder_id,
    v_app_uuid,
    '/' || v_model_code || '/'
  );
  
  RETURN v_model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new FLM within VC Model
CREATE OR REPLACE FUNCTION create_flm_model(
  p_vc_model_id UUID,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_flm_id UUID;
  v_flm_version INTEGER;
BEGIN
  -- Get next FLM version for this VC Model
  SELECT COALESCE(MAX(flm_version), 0) + 1
  INTO v_flm_version
  FROM flm_models
  WHERE vc_model_id = p_vc_model_id;
  
  -- Insert FLM model
  INSERT INTO flm_models (
    vc_model_id,
    status,
    current_step,
    flm_version,
    description,
    created_by
  ) VALUES (
    p_vc_model_id,
    'INITIATED',
    'BVS',
    v_flm_version,
    p_description,
    auth.uid()
  ) RETURNING id INTO v_flm_id;
  
  RETURN v_flm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add collaborator to VC Model
CREATE OR REPLACE FUNCTION add_vc_model_collaborator(
  p_vc_model_id UUID,
  p_stakeholder_id UUID,
  p_role TEXT DEFAULT 'COLLABORATOR',
  p_permissions JSONB DEFAULT '{"can_edit": true, "can_approve": false, "can_delete": false}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_collaborator_id UUID;
  v_current_stakeholder_id UUID;
BEGIN
  -- Get current stakeholder ID
  SELECT id INTO v_current_stakeholder_id FROM stakeholders WHERE auth_user_id = auth.uid() LIMIT 1;
  
  -- Check if user has permission to add collaborators (must be owner or have appropriate permissions)
  IF NOT EXISTS (
    SELECT 1 FROM vc_model_collaborators
    WHERE vc_model_id = p_vc_model_id
    AND stakeholder_id = v_current_stakeholder_id
    AND (role = 'OWNER' OR (permissions->>'can_edit')::boolean = true)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to add collaborators';
  END IF;
  
  -- Insert collaborator
  INSERT INTO vc_model_collaborators (
    vc_model_id,
    stakeholder_id,
    role,
    permissions,
    added_by
  ) VALUES (
    p_vc_model_id,
    p_stakeholder_id,
    p_role,
    p_permissions,
    auth.uid()
  ) RETURNING id INTO v_collaborator_id;
  
  RETURN v_collaborator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new version of VC Model
CREATE OR REPLACE FUNCTION create_vc_model_version(
  p_parent_vc_model_id UUID,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_new_model_id UUID;
  v_parent_model vc_models%ROWTYPE;
  v_new_version INTEGER;
BEGIN
  -- Get parent model
  SELECT * INTO v_parent_model
  FROM vc_models
  WHERE id = p_parent_vc_model_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent VC Model not found';
  END IF;
  
  -- Calculate new version number
  v_new_version := v_parent_model.version_number + 1;
  
  -- Mark parent as not current
  UPDATE vc_models
  SET is_current_version = false
  WHERE id = p_parent_vc_model_id;
  
  -- Create new version
  INSERT INTO vc_models (
    model_code,
    stakeholder_id,
    app_uuid,
    model_name,
    description,
    status,
    is_current_version,
    version_number,
    parent_version_id,
    created_by
  ) VALUES (
    v_parent_model.model_code,
    v_parent_model.stakeholder_id,
    v_parent_model.app_uuid,
    v_parent_model.model_name,
    COALESCE(p_description, v_parent_model.description || ' (v' || v_new_version || ')'),
    'INITIATED',
    true,
    v_new_version,
    p_parent_vc_model_id,
    auth.uid()
  ) RETURNING id INTO v_new_model_id;
  
  -- Copy collaborators from parent
  INSERT INTO vc_model_collaborators (vc_model_id, stakeholder_id, role, permissions, added_by)
  SELECT v_new_model_id, stakeholder_id, role, permissions, auth.uid()
  FROM vc_model_collaborators
  WHERE vc_model_id = p_parent_vc_model_id;
  
  RETURN v_new_model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 15: Create triggers for updated_at timestamps
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vc_models_updated_at
  BEFORE UPDATE ON vc_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flm_models_updated_at
  BEFORE UPDATE ON flm_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flm_artefacts_updated_at
  BEFORE UPDATE ON flm_artefacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 16: Register components in component_registry
-- =============================================================================

DO $$
DECLARE
  v_app_uuid UUID;
BEGIN
  -- Get app UUID from site_settings (components_registry references site_settings.app_uuid)
  SELECT app_uuid INTO v_app_uuid FROM site_settings WHERE site_code = 'VC_STUDIO' AND is_active = true LIMIT 1;
  
  IF v_app_uuid IS NULL THEN
    RAISE NOTICE 'VC_STUDIO site_settings not found, skipping component registration';
    RETURN;
  END IF;
  
  -- Register VC_DATA_MODEL (database schema - using placeholder for widget_component_name since NOT NULL)
  INSERT INTO components_registry (
    component_code,
    component_name,
    description,
    widget_component_name,
    default_params,
    is_active,
    app_uuid,
    version
  ) VALUES (
    'VC_DATA_MODEL',
    'VC Model Data Model',
    'Database schema for VC Models with versioning and collaboration',
    'DatabaseSchema', -- Placeholder (NOT NULL constraint requires a value, but this is a database schema, not a UI component)
    '{"phase": "1d.7", "reusable": true, "type": "database"}'::jsonb,
    true,
    v_app_uuid,
    '1.0'
  )
  ON CONFLICT (component_code) DO UPDATE
  SET
    component_name = EXCLUDED.component_name,
    description = EXCLUDED.description,
    default_params = EXCLUDED.default_params,
    updated_at = NOW();
  
  -- Register FLM_DATA_MODEL (database schema - using placeholder for widget_component_name since NOT NULL)
  INSERT INTO components_registry (
    component_code,
    component_name,
    description,
    widget_component_name,
    default_params,
    is_active,
    app_uuid,
    version
  ) VALUES (
    'FLM_DATA_MODEL',
    'FLM Data Model',
    'Database schema for FLM models and artefacts within VC Models',
    'DatabaseSchema', -- Placeholder (NOT NULL constraint requires a value, but this is a database schema, not a UI component)
    '{"phase": "1d.7", "reusable": true, "type": "database"}'::jsonb,
    true,
    v_app_uuid,
    '1.0'
  )
  ON CONFLICT (component_code) DO UPDATE
  SET
    component_name = EXCLUDED.component_name,
    description = EXCLUDED.description,
    default_params = EXCLUDED.default_params,
    updated_at = NOW();
  
  RAISE NOTICE '✓ Registered VC_DATA_MODEL and FLM_DATA_MODEL components';
END $$;

-- =============================================================================
-- STEP 17: Comments
-- =============================================================================

COMMENT ON TABLE vc_models IS 'Parent container for Value Chain Models with versioning and collaboration support';
COMMENT ON TABLE vc_model_collaborators IS 'Multi-stakeholder collaboration on VC Models';
COMMENT ON TABLE flm_models IS 'Framework Level Mapping (FLM) models within VC Models';
COMMENT ON TABLE flm_artefacts IS 'JSON artefacts for FLM steps (BVS, L0, L1, L2, Blueprint)';
COMMENT ON TABLE flm_source_documents IS 'Source documents uploaded for FLM context';

COMMENT ON FUNCTION create_vc_model IS 'Creates a new VC Model with root directory and owner collaborator';
COMMENT ON FUNCTION create_flm_model IS 'Creates a new FLM model within a VC Model';
COMMENT ON FUNCTION add_vc_model_collaborator IS 'Adds a collaborator to a VC Model with specified role and permissions';
COMMENT ON FUNCTION create_vc_model_version IS 'Creates a new version of a VC Model, copying collaborators';
