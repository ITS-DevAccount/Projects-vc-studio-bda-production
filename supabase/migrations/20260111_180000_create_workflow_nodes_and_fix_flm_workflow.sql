-- FLM Component Suite - Create workflow_nodes table and register BUILD_FLM workflow
-- File: 20260111_180000_create_workflow_nodes_and_fix_flm_workflow.sql
-- Purpose: Create workflow_nodes table and properly register BUILD_FLM workflow using actual schema

-- =============================================================================
-- CREATE workflow_nodes TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  node_code TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK', 'GATEWAY', 'START', 'END')),
  node_name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(workflow_definition_id, node_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow_definition_id ON workflow_nodes(workflow_definition_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_node_code ON workflow_nodes(node_code);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_sequence ON workflow_nodes(workflow_definition_id, sequence);

-- =============================================================================
-- REGISTER BUILD_FLM WORKFLOW (using correct schema)
-- =============================================================================

DO $$
DECLARE
  v_build_flm_id UUID;
BEGIN
  -- Check if BUILD_FLM workflow definition already exists
  SELECT id INTO v_build_flm_id 
  FROM workflow_definitions 
  WHERE workflow_code = 'BUILD_FLM' AND app_code = 'VC_STUDIO';

  -- If it exists, update it; otherwise insert it
  IF v_build_flm_id IS NOT NULL THEN
    -- Update existing workflow definition
    UPDATE workflow_definitions SET
      name = 'Build Framework Level Model',
      description = 'Create L0-L2 Value Chain Model for any business through AI-assisted workflow',
      model_structure = '{
        "reusable": true,
        "stakeholderTypes": ["all"],
        "prerequisiteWorkflows": [],
        "outputFolder": "/flm",
        "version": "1.0",
        "phases": ["BVS Capture", "DBS Generation", "L0 Domain", "L1 Pillars", "L2 Capabilities"],
        "workflow_type": "SEQUENTIAL"
      }'::jsonb,
      status = 'ACTIVE',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_build_flm_id;
  ELSE
    -- Insert new workflow definition
    INSERT INTO workflow_definitions (
      app_code,
      workflow_code,
      name,
      description,
      model_structure,
      version,
      status,
      is_active
    ) VALUES (
      'VC_STUDIO',
      'BUILD_FLM',
      'Build Framework Level Model',
      'Create L0-L2 Value Chain Model for any business through AI-assisted workflow',
      '{
        "reusable": true,
        "stakeholderTypes": ["all"],
        "prerequisiteWorkflows": [],
        "outputFolder": "/flm",
        "version": "1.0",
        "phases": ["BVS Capture", "DBS Generation", "L0 Domain", "L1 Pillars", "L2 Capabilities"],
        "workflow_type": "SEQUENTIAL"
      }'::jsonb,
      1,
      'ACTIVE',
      true
    ) RETURNING id INTO v_build_flm_id;
  END IF;

  -- Verify we have the ID
  IF v_build_flm_id IS NULL THEN
    SELECT id INTO v_build_flm_id 
    FROM workflow_definitions 
    WHERE workflow_code = 'BUILD_FLM' AND app_code = 'VC_STUDIO';
  END IF;

  IF v_build_flm_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create or find BUILD_FLM workflow definition';
  END IF;

  RAISE NOTICE 'BUILD_FLM workflow definition ID: %', v_build_flm_id;

  -- =============================================================================
  -- INSERT WORKFLOW NODES
  -- =============================================================================

  -- CAPTURE_BVS (sequence 1)
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
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- GENERATE_DBS_SCHEMA (sequence 2)
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
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- COMPLETE_DBS (sequence 3)
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
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- REVIEW_DBS (sequence 4)
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
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- GENERATE_L0 (sequence 5)
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
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- REVIEW_L0 (sequence 6)
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'REVIEW_L0',
    'USER_TASK',
    'Review L0 Domain Study',
    6,
    '{
      "taskType": "review_edit",
      "component": "FLM_L0_BUILDER",
      "reviewConfig": {
        "artefactSource": "{{tasks.GENERATE_L0.output}}",
        "allowEdit": true,
        "confirmAction": "confirm"
      },
      "outputPath": "/flm/approved/l0.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- GENERATE_L1 (sequence 7)
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
        "bvs": "{{tasks.CAPTURE_BVS.output.bvs}}",
        "dbs": "{{tasks.COMPLETE_DBS.output}}",
        "l0": "{{tasks.REVIEW_L0.output}}"
      },
      "outputPath": "/flm/drafts/l1_draft.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- REVIEW_L1 (sequence 8)
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'REVIEW_L1',
    'USER_TASK',
    'Review L1 Pillars',
    8,
    '{
      "taskType": "review_edit",
      "component": "FLM_L1_BUILDER",
      "reviewConfig": {
        "artefactSource": "{{tasks.GENERATE_L1.output}}",
        "allowEdit": true,
        "validation": {
          "require_unit_economics": true,
          "min_pillars": 3,
          "max_pillars": 6
        },
        "confirmAction": "confirm"
      },
      "outputPath": "/flm/approved/l1.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- GENERATE_L2 (sequence 9)
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
        "l0": "{{tasks.REVIEW_L0.output}}",
        "l1": "{{tasks.REVIEW_L1.output}}"
      },
      "outputPath": "/flm/drafts/l2_draft.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- REVIEW_L2 (sequence 10)
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'REVIEW_L2',
    'USER_TASK',
    'Review L2 Capabilities',
    10,
    '{
      "taskType": "review_edit",
      "component": "FLM_L2_BUILDER",
      "reviewConfig": {
        "artefactSource": "{{tasks.GENERATE_L2.output}}",
        "allowEdit": true,
        "confirmAction": "confirm"
      },
      "outputPath": "/flm/approved/l2.json"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- FINAL_APPROVAL (sequence 11)
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'FINAL_APPROVAL',
    'USER_TASK',
    'Final FLM Approval',
    11,
    '{
      "taskType": "review_gate",
      "reviewConfig": {
        "reviewType": "FINAL_APPROVAL",
        "summaryData": {
          "bvs": "{{tasks.CAPTURE_BVS.output}}",
          "dbs": "{{tasks.COMPLETE_DBS.output}}",
          "l0": "{{tasks.REVIEW_L0.output}}",
          "l1": "{{tasks.REVIEW_L1.output}}",
          "l2": "{{tasks.REVIEW_L2.output}}"
        },
        "routing": ["stakeholder"],
        "actions": ["approve", "request_changes"],
        "allowEdit": false
      },
      "onApprove": "GENERATE_BLUEPRINT",
      "onRequestChanges": "REVIEW_L2"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- GENERATE_BLUEPRINT (sequence 12)
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'GENERATE_BLUEPRINT',
    'SERVICE_TASK',
    'Generate Business Blueprint',
    12,
    '{
      "serviceType": "CLAUDE_PROMPT",
      "promptCode": "FLM_TO_BLUEPRINT",
      "inputMapping": {
        "flm": {
          "bvs": "{{tasks.CAPTURE_BVS.output}}",
          "dbs": "{{tasks.COMPLETE_DBS.output}}",
          "l0": "{{tasks.REVIEW_L0.output}}",
          "l1": "{{tasks.REVIEW_L1.output}}",
          "l2": "{{tasks.REVIEW_L2.output}}"
        }
      },
      "outputPath": "/flm/blueprint/business_blueprint.md"
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  -- FLM_COMPLETE (sequence 13)
  INSERT INTO workflow_nodes (
    workflow_definition_id,
    node_code,
    node_type,
    node_name,
    sequence,
    config
  ) VALUES (
    v_build_flm_id,
    'FLM_COMPLETE',
    'END',
    'FLM Complete',
    13,
    '{
      "finalActions": [
        "UPDATE_FLM_MODEL_STATUS_COMPLETED",
        "GENERATE_COMPLETION_NOTIFICATION"
      ]
    }'::jsonb
  ) ON CONFLICT (workflow_definition_id, node_code) DO UPDATE SET
    node_name = EXCLUDED.node_name,
    sequence = EXCLUDED.sequence,
    config = EXCLUDED.config,
    updated_at = NOW();

  RAISE NOTICE '✓ BUILD_FLM workflow nodes created successfully';
END $$;

-- Comments
COMMENT ON TABLE workflow_nodes IS 'Workflow nodes define the steps/tasks within a workflow definition';
COMMENT ON COLUMN workflow_nodes.workflow_definition_id IS 'References workflow_definitions.id';
COMMENT ON COLUMN workflow_nodes.node_code IS 'Unique code within the workflow (e.g., CAPTURE_BVS)';
COMMENT ON COLUMN workflow_nodes.node_type IS 'Type of node: USER_TASK, SERVICE_TASK, AI_AGENT_TASK, GATEWAY, START, END';
COMMENT ON COLUMN workflow_nodes.sequence IS 'Order of execution within the workflow';
COMMENT ON COLUMN workflow_nodes.config IS 'JSONB configuration specific to the node type';
