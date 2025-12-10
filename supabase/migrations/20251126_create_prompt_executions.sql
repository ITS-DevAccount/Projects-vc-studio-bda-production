-- Sprint 1d.7: FLM Building Workflow - Prompt Executions
-- Phase A: AI Interface Foundation

-- Prompt Execution Log
CREATE TABLE IF NOT EXISTS prompt_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Context
    prompt_template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
    llm_interface_id UUID REFERENCES llm_interfaces(id) ON DELETE SET NULL,
    stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
    workflow_instance_id UUID REFERENCES workflow_instances(instance_id) ON DELETE CASCADE,
    task_id UUID REFERENCES instance_tasks(task_id) ON DELETE SET NULL,

    -- Request
    input_data JSONB NOT NULL,
    rendered_prompt TEXT,
    model_used TEXT,
    temperature NUMERIC,
    max_tokens INTEGER,

    -- Response
    output_data JSONB,
    raw_response TEXT,

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,

    -- Metrics
    tokens_input INTEGER,
    tokens_output INTEGER,
    cost_estimate NUMERIC(10, 6),
    duration_ms INTEGER,

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prompt_executions_template ON prompt_executions(prompt_template_id);
CREATE INDEX idx_prompt_executions_stakeholder ON prompt_executions(stakeholder_id);
CREATE INDEX idx_prompt_executions_workflow ON prompt_executions(workflow_instance_id);
CREATE INDEX idx_prompt_executions_task ON prompt_executions(task_id);
CREATE INDEX idx_prompt_executions_status ON prompt_executions(status);
CREATE INDEX idx_prompt_executions_created ON prompt_executions(created_at DESC);

-- RLS Policies
ALTER TABLE prompt_executions ENABLE ROW LEVEL SECURITY;

-- Admin can view all executions
CREATE POLICY prompt_executions_admin_all ON prompt_executions
    FOR ALL
    USING (is_user_admin());

-- Stakeholders can view their own executions
CREATE POLICY prompt_executions_stakeholder_view ON prompt_executions
    FOR SELECT
    USING (
        stakeholder_id IN (
            SELECT stakeholder_id FROM stakeholders
            WHERE user_id = auth.uid()
        )
    );

-- System can insert executions
CREATE POLICY prompt_executions_system_insert ON prompt_executions
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- System can update executions
CREATE POLICY prompt_executions_system_update ON prompt_executions
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Comments
COMMENT ON TABLE prompt_executions IS 'Sprint 1d.7: Execution log for all AI prompt calls with metrics';
COMMENT ON COLUMN prompt_executions.input_data IS 'Variables passed to the prompt template';
COMMENT ON COLUMN prompt_executions.rendered_prompt IS 'Final prompt sent to Claude after variable substitution';
COMMENT ON COLUMN prompt_executions.output_data IS 'Parsed and validated output from Claude';
COMMENT ON COLUMN prompt_executions.cost_estimate IS 'Estimated cost in USD based on token usage';
