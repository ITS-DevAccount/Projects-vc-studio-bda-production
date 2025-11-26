-- Sprint 1d.7: FLM Building Workflow - Service Registration and Workflow Definitions
-- Phase C: FLM Assembly

-- Register Claude as a service in service_configurations
INSERT INTO service_configurations (
  app_uuid,
  service_name,
  service_type,
  description,
  is_active,
  config
) VALUES (
  (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'),
  'Claude AI - Prompt Execution',
  'REAL',
  'Execute prompts from prompt library via Claude API for FLM creation',
  true,
  '{
    "service_type": "CLAUDE_PROMPT",
    "endpoint": "internal",
    "timeout_ms": 60000,
    "retry_strategy": {
      "max_retries": 3,
      "backoff_type": "exponential"
    }
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Register BUILD_FLM workflow
INSERT INTO workflow_definitions (
  app_uuid,
  workflow_code,
  workflow_name,
  description,
  workflow_type,
  is_active,
  config
) VALUES (
  (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'),
  'BUILD_FLM',
  'Build Framework Level Model',
  'Create L0-L2 Value Chain Model for any business through AI-assisted workflow',
  'SEQUENTIAL',
  true,
  '{
    "reusable": true,
    "stakeholderTypes": ["all"],
    "prerequisiteWorkflows": [],
    "outputFolder": "/flm",
    "version": "1.0",
    "phases": ["BVS Capture", "DBS Generation", "L0 Domain", "L1 Pillars", "L2 Capabilities"]
  }'::jsonb
) ON CONFLICT (app_uuid, workflow_code) DO UPDATE SET
  description = EXCLUDED.description,
  config = EXCLUDED.config;

-- Register GENERATE_FINANCE_DOCS workflow
INSERT INTO workflow_definitions (
  app_uuid,
  workflow_code,
  workflow_name,
  description,
  workflow_type,
  is_active,
  config
) VALUES (
  (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'),
  'GENERATE_FINANCE_DOCS',
  'Generate Investment Documents',
  'Create investment documentation from completed FLM (Blueprint, One-Pager, Pitch Deck)',
  'SEQUENTIAL',
  true,
  '{
    "reusable": false,
    "stakeholderTypes": ["investment_seeking"],
    "prerequisiteWorkflows": ["BUILD_FLM"],
    "prerequisiteCheck": "flmStatus.isApproved === true",
    "outputFolder": "/generated",
    "version": "1.0",
    "documents": ["Business Blueprint", "One-Pager", "Pitch Deck"]
  }'::jsonb
) ON CONFLICT (app_uuid, workflow_code) DO UPDATE SET
  description = EXCLUDED.description,
  config = EXCLUDED.config;

-- Get the workflow definition IDs for creating nodes
DO $$
DECLARE
  v_app_uuid UUID;
  v_build_flm_id UUID;
  v_finance_docs_id UUID;
BEGIN
  -- Get app UUID
  SELECT app_uuid INTO v_app_uuid FROM applications WHERE app_code = 'VC_STUDIO';

  -- Get workflow IDs
  SELECT id INTO v_build_flm_id FROM workflow_definitions WHERE workflow_code = 'BUILD_FLM' AND app_uuid = v_app_uuid;
  SELECT id INTO v_finance_docs_id FROM workflow_definitions WHERE workflow_code = 'GENERATE_FINANCE_DOCS' AND app_uuid = v_app_uuid;

  -- BUILD_FLM Workflow Nodes

  -- CAPTURE_BVS
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'CAPTURE_BVS',
    'USER_TASK',
    'Business Value Summary',
    1,
    '{
      "taskType": "form",
      "formConfig": {
        "fields": [{
          "name": "bvs",
          "type": "textarea",
          "label": "Describe your business",
          "placeholder": "What does your business do? Who do you serve? How do you create value?",
          "helpText": "Example: I want to sell roasted coffee. I buy from wholesalers or direct from source countries. I roast in-house in the UK. I sell to coffee shops and online.",
          "validation": { "minLength": 50, "maxLength": 2000, "required": true }
        }]
      },
      "outputPath": "/flm/drafts/bvs_draft.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    config = EXCLUDED.config;

  -- GENERATE_DBS_SCHEMA
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'GENERATE_DBS_SCHEMA',
    'SERVICE_TASK',
    'Generate Business Data Schema',
    2,
    '{
      "serviceType": "CLAUDE_PROMPT",
      "promptCode": "BVS_TO_DBS",
      "inputMapping": {
        "bvs": "{{tasks.CAPTURE_BVS.output.bvs}}"
      },
      "outputPath": "/flm/drafts/dbs_schema.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    config = EXCLUDED.config;

  -- COMPLETE_DBS
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'COMPLETE_DBS',
    'USER_TASK',
    'Complete Business Summary',
    3,
    '{
      "taskType": "dynamic_form",
      "schemaSource": "{{tasks.GENERATE_DBS_SCHEMA.output.schema}}",
      "prefillSource": "{{tasks.GENERATE_DBS_SCHEMA.output.prefill}}",
      "outputPath": "/flm/drafts/dbs_draft.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    config = EXCLUDED.config;

  -- REVIEW_DBS
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'REVIEW_DBS',
    'USER_TASK',
    'Review Business Summary',
    4,
    '{
      "taskType": "review_gate",
      "reviewConfig": {
        "contentSource": "{{tasks.COMPLETE_DBS.output}}",
        "routing": ["client", "admin"],
        "actions": ["approve", "request_changes"],
        "allowEdit": true
      },
      "onApprove": "GENERATE_L0",
      "onRequestChanges": "COMPLETE_DBS"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    config = EXCLUDED.config;

  -- GENERATE_L0
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'GENERATE_L0',
    'SERVICE_TASK',
    'Generate Domain Study (L0)',
    5,
    '{
      "serviceType": "CLAUDE_PROMPT",
      "promptCode": "DBS_TO_L0",
      "inputMapping": {
        "bvs": "{{tasks.CAPTURE_BVS.output.bvs}}",
        "dbs": "{{tasks.COMPLETE_DBS.output}}"
      },
      "outputPath": "/flm/drafts/l0_draft.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    config = EXCLUDED.config;

  -- GENERATE_L1
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'GENERATE_L1',
    'SERVICE_TASK',
    'Generate Business Pillars (L1)',
    7,
    '{
      "serviceType": "CLAUDE_PROMPT",
      "promptCode": "L0_TO_L1",
      "inputMapping": {
        "l0": "{{tasks.GENERATE_L0.output}}",
        "pillars": "{{tasks.REVIEW_L0.output.pillars}}",
        "unitEconomics": "{{tasks.REVIEW_L0.output.unitEconomics}}"
      },
      "outputPath": "/flm/drafts/l1_draft.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    config = EXCLUDED.config;

  -- GENERATE_L2
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'GENERATE_L2',
    'SERVICE_TASK',
    'Generate Capabilities Matrix (L2)',
    9,
    '{
      "serviceType": "CLAUDE_PROMPT",
      "promptCode": "L1_TO_L2",
      "inputMapping": {
        "bvs": "{{tasks.CAPTURE_BVS.output.bvs}}",
        "dbs": "{{tasks.COMPLETE_DBS.output}}",
        "l0": "{{tasks.GENERATE_L0.output}}",
        "l1": "{{tasks.GENERATE_L1.output}}"
      },
      "outputPath": "/flm/drafts/l2_draft.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    config = EXCLUDED.config;

END $$;

-- Comments
COMMENT ON TABLE service_configurations IS 'Service configurations including Claude AI for prompt execution';
COMMENT ON TABLE workflow_definitions IS 'Workflow definitions including BUILD_FLM and GENERATE_FINANCE_DOCS';
