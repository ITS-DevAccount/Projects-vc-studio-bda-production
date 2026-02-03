-- Remove collaborator-based access for VC Models and FLM tables.
-- This avoids vc_model_collaborators policy recursion while collaboration is disabled.

-- Drop collaborator policies on vc_models.
DROP POLICY IF EXISTS vc_models_collaborator_access ON vc_models;
DROP POLICY IF EXISTS vc_models_collaborator_update ON vc_models;

-- Drop collaborator policies on vc_model_collaborators.
DROP POLICY IF EXISTS vc_model_collaborators_access ON vc_model_collaborators;
DROP POLICY IF EXISTS vc_model_collaborators_owner_manage ON vc_model_collaborators;

-- Disable RLS on vc_model_collaborators while the feature is inactive.
ALTER TABLE vc_model_collaborators DISABLE ROW LEVEL SECURITY;

-- Replace FLM policies with owner-only access.
DROP POLICY IF EXISTS flm_models_vc_model_access ON flm_models;
CREATE POLICY flm_models_owner_access ON flm_models
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vc_models vm
      WHERE vm.id = flm_models.vc_model_id
      AND vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vc_models vm
      WHERE vm.id = flm_models.vc_model_id
      AND vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS flm_artefacts_access ON flm_artefacts;
CREATE POLICY flm_artefacts_owner_access ON flm_artefacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flm_models fm
      JOIN vc_models vm ON vm.id = fm.vc_model_id
      WHERE fm.id = flm_artefacts.flm_model_id
      AND vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flm_models fm
      JOIN vc_models vm ON vm.id = fm.vc_model_id
      WHERE fm.id = flm_artefacts.flm_model_id
      AND vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS flm_source_documents_access ON flm_source_documents;
CREATE POLICY flm_source_documents_owner_access ON flm_source_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flm_models fm
      JOIN vc_models vm ON vm.id = fm.vc_model_id
      WHERE fm.id = flm_source_documents.flm_model_id
      AND vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flm_models fm
      JOIN vc_models vm ON vm.id = fm.vc_model_id
      WHERE fm.id = flm_source_documents.flm_model_id
      AND vm.stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  );
