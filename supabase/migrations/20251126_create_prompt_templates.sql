-- Sprint 1d.7: FLM Building Workflow - Prompt Templates
-- Phase A: AI Interface Foundation

-- Prompt Templates Library
CREATE TABLE IF NOT EXISTS prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_uuid UUID NOT NULL REFERENCES applications(app_uuid) ON DELETE CASCADE,

    -- Identification
    prompt_code TEXT UNIQUE NOT NULL,
    prompt_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('FLM', 'AGM', 'DOCUMENT', 'ANALYSIS')),

    -- Prompt Configuration
    system_prompt TEXT,
    user_prompt_template TEXT NOT NULL,

    -- Model Configuration
    default_llm_interface_id UUID REFERENCES llm_interfaces(id) ON DELETE SET NULL,
    default_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
    temperature NUMERIC DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
    max_tokens INTEGER DEFAULT 4096 CHECK (max_tokens > 0),

    -- Input/Output Schema
    input_schema JSONB DEFAULT '{}',
    output_schema JSONB DEFAULT '{}',
    output_format TEXT DEFAULT 'json' CHECK (output_format IN ('json', 'markdown', 'text')),

    -- Versioning
    version INTEGER DEFAULT 1 CHECK (version > 0),
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prompt_templates_code ON prompt_templates(prompt_code);
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX idx_prompt_templates_active ON prompt_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_prompt_templates_app_uuid ON prompt_templates(app_uuid);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_prompt_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prompt_templates_updated_at
    BEFORE UPDATE ON prompt_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_templates_updated_at();

-- RLS Policies
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY prompt_templates_admin_all ON prompt_templates
    FOR ALL
    USING (is_user_admin());

-- All authenticated users can view active prompts
CREATE POLICY prompt_templates_view_active ON prompt_templates
    FOR SELECT
    USING (is_active = true AND auth.uid() IS NOT NULL);

-- Comments
COMMENT ON TABLE prompt_templates IS 'Sprint 1d.7: Library of AI prompts for FLM creation and document generation';
COMMENT ON COLUMN prompt_templates.prompt_code IS 'Unique identifier for the prompt (e.g., BVS_TO_DBS)';
COMMENT ON COLUMN prompt_templates.category IS 'Prompt category: FLM, AGM, DOCUMENT, or ANALYSIS';
COMMENT ON COLUMN prompt_templates.user_prompt_template IS 'Prompt template with {{variable}} placeholders';
COMMENT ON COLUMN prompt_templates.default_model IS 'Default Claude model: sonnet, opus, or haiku';
COMMENT ON COLUMN prompt_templates.output_format IS 'Expected output format: json, markdown, or text';
