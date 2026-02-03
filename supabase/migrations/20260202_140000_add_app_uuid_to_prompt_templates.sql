
-- Add app_uuid to prompt_templates for multi-tenancy filtering

ALTER TABLE prompt_templates
  ADD COLUMN IF NOT EXISTS app_uuid UUID;

UPDATE prompt_templates
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE prompt_templates
  ADD CONSTRAINT IF NOT EXISTS fk_prompt_templates_app_uuid
  FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_prompt_templates_app_uuid ON prompt_templates(app_uuid);
