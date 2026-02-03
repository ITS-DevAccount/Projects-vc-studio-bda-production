-- Allow PRELIMINARY_DBS as a valid FLM current step

ALTER TABLE flm_models
  DROP CONSTRAINT IF EXISTS flm_models_current_step_check;

ALTER TABLE flm_models
  ADD CONSTRAINT flm_models_current_step_check
  CHECK (current_step IN ('BVS', 'PRELIMINARY_DBS', 'L0', 'L1', 'L2', 'BLUEPRINT'));
