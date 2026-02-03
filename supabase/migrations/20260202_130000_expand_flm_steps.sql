
-- Expand FLM step and artefact constraints to include DBS stages

ALTER TABLE flm_models DROP CONSTRAINT IF EXISTS flm_models_current_step_check;

ALTER TABLE flm_models ADD CONSTRAINT flm_models_current_step_check
CHECK (current_step = ANY(ARRAY[
  'BVS'::text,
  'PRELIMINARY_DBS'::text,
  'DBS_REVIEW'::text,
  'DBS_COMPLETE'::text,
  'L0'::text,
  'L1'::text,
  'L2'::text,
  'BLUEPRINT'::text
]));

ALTER TABLE flm_artefacts DROP CONSTRAINT IF EXISTS flm_artefacts_artefact_type_check;

ALTER TABLE flm_artefacts ADD CONSTRAINT flm_artefacts_artefact_type_check
CHECK (artefact_type = ANY(ARRAY[
  'BVS'::text,
  'PRELIMINARY_DBS'::text,
  'DBS_REVIEW'::text,
  'DBS_COMPLETE'::text,
  'L0'::text,
  'L1'::text,
  'L2'::text,
  'BLUEPRINT'::text
]));
