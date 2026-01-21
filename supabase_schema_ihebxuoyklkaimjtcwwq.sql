-- SQL Schema Dump for Supabase Project: ihebxuoyklkaimjtcwwq
-- Generated: 2025-01-XX
-- This file contains the complete database schema including tables, constraints, indexes, and views

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE llm_provider AS ENUM ('anthropic', 'openai', 'deepseek', 'gemini');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Note: This is a comprehensive schema dump. For full table definitions with all columns,
-- constraints, indexes, and views, please refer to the TypeScript types file or use
-- pg_dump for a complete schema export.-- Core application tables
CREATE TABLE IF NOT EXISTS applications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_code text UNIQUE NOT NULL,
    app_name text NOT NULL,
    description text,
    domain_type text NOT NULL CHECK (domain_type IN ('ADA', 'PDA', 'BDA')),
    owner_id uuid REFERENCES users(id),
    is_active boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_uuid uuid UNIQUE DEFAULT gen_random_uuid(),
    site_name varchar(200) NOT NULL DEFAULT 'VC Studio',
    site_tagline text,
    logo_url text,
    logo_public_id text,
    logo_width integer DEFAULT 180,
    logo_height integer DEFAULT 60,
    favicon_url text,
    primary_color varchar(7) DEFAULT '#2563eb',
    primary_hover varchar(7) DEFAULT '#1d4ed8',
    secondary_color varchar(7) DEFAULT '#7c3aed',
    secondary_hover varchar(7) DEFAULT '#6d28d9',
    background_color varchar(7) DEFAULT '#ffffff',
    background_subtle varchar(7) DEFAULT '#f9fafb',
    section_light varchar(7) DEFAULT '#f3f4f6',
    section_subtle varchar(7) DEFAULT '#e5e7eb',
    section_emphasis varchar(7) DEFAULT '#1f2937',
    section_border varchar(7) DEFAULT '#d1d5db',
    text_primary varchar(7) DEFAULT '#111827',
    text_secondary varchar(7) DEFAULT '#4b5563',
    text_muted varchar(7) DEFAULT '#6b7280',
    text_light varchar(7) DEFAULT '#9ca3af',
    success_color varchar(7) DEFAULT '#10b981',
    error_color varchar(7) DEFAULT '#ef4444',
    warning_color varchar(7) DEFAULT '#f59e0b',
    info_color varchar(7) DEFAULT '#3b82f6',
    font_heading varchar(100) DEFAULT 'Inter, system-ui, sans-serif',
    font_body varchar(100) DEFAULT 'Inter, system-ui, sans-serif',
    border_radius varchar(20) DEFAULT '0.5rem',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    site_code text,
    domain_code text,
    is_active_app boolean DEFAULT true
);

-- Users and authentication
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id uuid UNIQUE REFERENCES auth.users(id),
    email text UNIQUE NOT NULL,
    display_name text NOT NULL,
    role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'domain_admin', 'manager', 'viewer')),
    permissions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    profile_metadata jsonb DEFAULT '{}'::jsonb,
    last_login timestamptz,
    login_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);-- Stakeholders
CREATE TABLE IF NOT EXISTS stakeholder_types (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    label text NOT NULL,
    description text,
    is_individual boolean DEFAULT false,
    is_organization boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true
);CREATE TABLE IF NOT EXISTS stakeholders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('STK-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    name text NOT NULL,
    stakeholder_type_id uuid NOT NULL REFERENCES stakeholder_types(id),
    email text,
    phone text,
    website text,
    country text,
    region text,
    city text,
    address jsonb DEFAULT '{}'::jsonb,
    auth_user_id uuid REFERENCES auth.users(id),
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    is_verified boolean DEFAULT false,
    verified_by uuid,
    verified_at timestamptz,
    industry text,
    sector text,
    size_employees integer,
    annual_revenue numeric,
    founded_year integer,
    parent_stakeholder_id uuid REFERENCES stakeholders(id),
    metadata jsonb DEFAULT '{}'::jsonb,
    tags text[] DEFAULT '{}'::text[],
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    primary_role_id uuid REFERENCES roles(id),
    is_user boolean DEFAULT false,
    invite_email text,
    core_config jsonb DEFAULT '{}'::jsonb
);

-- Roles and permissions
CREATE TABLE IF NOT EXISTS roles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    label text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid),
    scope text DEFAULT 'general' CHECK (scope IN ('general', 'specific')),
    specific_stakeholder_type_id uuid REFERENCES stakeholder_types(id),
    workspace_template_id uuid REFERENCES workspace_templates(id)
);

CREATE TABLE IF NOT EXISTS stakeholder_roles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    role_type text NOT NULL,
    assigned_by uuid,
    assigned_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    role_id uuid REFERENCES roles(id),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid)
);-- Workflows
CREATE TABLE IF NOT EXISTS workflow_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid),
    type_code text NOT NULL,
    name text NOT NULL,
    description text,
    rules jsonb NOT NULL DEFAULT '{}'::jsonb,
    applicable_maturity_gates text[] DEFAULT ARRAY['FLM'::text, 'AGM'::text, 'Full'::text],
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code text UNIQUE NOT NULL,
    workflow_type text NOT NULL,
    name text NOT NULL,
    description text,
    maturity_gate text,
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    workflow_type_id uuid REFERENCES workflow_types(id),
    definition jsonb DEFAULT '{"nodes": [], "metadata": {}, "transitions": []}'::jsonb
);

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_code text NOT NULL,
    workflow_code text NOT NULL,
    name text NOT NULL,
    description text,
    model_structure jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'DEPRECATED')),
    is_active boolean DEFAULT true,
    l4_operation_code text,
    created_at timestamptz DEFAULT now(),
    created_by uuid,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid
);CREATE TABLE IF NOT EXISTS workflow_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_code text NOT NULL,
    workflow_definition_id uuid NOT NULL REFERENCES workflow_templates(id),
    workflow_code text NOT NULL,
    current_node_id text,
    status text NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'SUSPENDED', 'ERROR')),
    input_data jsonb DEFAULT '{}'::jsonb,
    error_message text,
    initiated_by uuid,
    initiated_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    suspended_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    instance_name text
);

CREATE TABLE IF NOT EXISTS instance_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_code text NOT NULL,
    workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id),
    workflow_code text NOT NULL,
    function_code text NOT NULL REFERENCES function_registry(function_code),
    node_id text NOT NULL,
    task_type text NOT NULL CHECK (task_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK')),
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    input_data jsonb DEFAULT '{}'::jsonb,
    output_data jsonb,
    assigned_to uuid,
    assigned_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    error_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true
);CREATE TABLE IF NOT EXISTS instance_context (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_code text NOT NULL,
    workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id),
    context_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_code text NOT NULL,
    workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id),
    event_type text NOT NULL CHECK (event_type IN ('INSTANCE_CREATED', 'NODE_ENTERED', 'TASK_CREATED', 'TASK_COMPLETED', 'TASK_FAILED', 'TRANSITION', 'INSTANCE_COMPLETED', 'INSTANCE_SUSPENDED')),
    node_id text,
    task_id uuid REFERENCES instance_tasks(id),
    from_node_id text,
    to_node_id text,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    actor_id uuid,
    event_timestamp timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);CREATE TABLE IF NOT EXISTS workflow_execution_queue (
    queue_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_code text NOT NULL,
    workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id),
    trigger_type text NOT NULL,
    trigger_data jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'PENDING',
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz
);-- Function registry
CREATE TABLE IF NOT EXISTS function_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_code text,
    function_code text UNIQUE NOT NULL,
    implementation_type text NOT NULL CHECK (implementation_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK')),
    endpoint_or_path text,
    input_schema jsonb DEFAULT '{}'::jsonb,
    output_schema jsonb DEFAULT '{}'::jsonb,
    ui_widget_id text,
    ui_definitions jsonb DEFAULT '{}'::jsonb,
    description text,
    version text DEFAULT '1.0',
    tags text[] DEFAULT '{}'::text[],
    timeout_seconds integer DEFAULT 300,
    retry_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    created_by uuid,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid
);

CREATE TABLE IF NOT EXISTS functions_registry (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    function_code text UNIQUE NOT NULL,
    function_name text NOT NULL,
    description text,
    module_path text,
    handler_name text,
    required_capability_id uuid REFERENCES capabilities(id),
    minimum_proficiency_level text DEFAULT 'beginner',
    requires_human_approval boolean DEFAULT false,
    timeout_seconds integer,
    max_retries integer DEFAULT 3,
    can_be_called_by_ai boolean DEFAULT false,
    ai_description text,
    parameters_schema jsonb DEFAULT '{}'::jsonb,
    response_schema jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    execution_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    last_executed_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Service configurations
CREATE TABLE IF NOT EXISTS service_configurations (
    service_config_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid NOT NULL REFERENCES applications(id),
    service_name text NOT NULL,
    service_type text NOT NULL CHECK (service_type IN ('REAL', 'MOCK')),
    endpoint_url text,
    http_method text DEFAULT 'POST' CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    timeout_seconds integer DEFAULT 30,
    max_retries integer DEFAULT 3,
    authentication jsonb,
    mock_template_id text,
    mock_definition jsonb,
    is_active boolean DEFAULT true,
    description text,
    created_by uuid REFERENCES stakeholders(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);CREATE TABLE IF NOT EXISTS service_task_queue (
    queue_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid NOT NULL REFERENCES applications(id),
    instance_id uuid NOT NULL REFERENCES workflow_instances(id),
    task_id uuid NOT NULL REFERENCES instance_tasks(id),
    service_config_id uuid NOT NULL REFERENCES service_configurations(service_config_id),
    status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    input_data jsonb,
    output_data jsonb,
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    last_attempt_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    completed_at timestamptz
);CREATE TABLE IF NOT EXISTS service_execution_logs (
    log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid NOT NULL REFERENCES applications(id),
    instance_id uuid REFERENCES workflow_instances(id),
    task_id uuid REFERENCES instance_tasks(id),
    service_config_id uuid REFERENCES service_configurations(service_config_id),
    service_name text NOT NULL,
    status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'TIMEOUT', 'ERROR')),
    request_data jsonb,
    response_data jsonb,
    error_message text,
    execution_time_ms integer,
    http_status_code integer,
    retry_attempt integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);-- AI and LLM
CREATE TABLE IF NOT EXISTS llm_interfaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider llm_provider NOT NULL,
    name text UNIQUE NOT NULL,
    api_key_enc text NOT NULL,
    base_url text,
    default_model text DEFAULT 'claude-sonnet-4-5-20250929',
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_prompts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    model text NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    max_tokens integer DEFAULT 4096,
    temperature numeric DEFAULT 0.7,
    system_prompt text,
    user_prompt_template text NOT NULL,
    output_format text DEFAULT 'json',
    input_variables jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    version integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    default_viewer_code text
);CREATE TABLE IF NOT EXISTS ai_prompt_executions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('EXEC-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    prompt_id uuid REFERENCES ai_prompts(id),
    prompt_code text NOT NULL,
    input_variables jsonb DEFAULT '{}'::jsonb,
    rendered_prompt text,
    model text NOT NULL,
    llm_interface_id uuid,
    raw_response text,
    parsed_output jsonb,
    output_format text,
    viewer_code text,
    viewer_rendered boolean DEFAULT false,
    status text DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    cost_estimate numeric,
    duration_seconds numeric,
    error_message text,
    error_details jsonb,
    stakeholder_id uuid REFERENCES stakeholders(id),
    app_uuid uuid,
    executed_by uuid REFERENCES users(id),
    execution_source text DEFAULT 'test_harness',
    created_at timestamptz DEFAULT now()
);CREATE TABLE IF NOT EXISTS prompt_templates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id uuid NOT NULL REFERENCES applications(id),
    prompt_code text NOT NULL,
    prompt_name text NOT NULL,
    description text,
    category text NOT NULL CHECK (category IN ('FLM', 'AGM', 'DOCUMENT', 'ANALYSIS')),
    system_prompt text,
    user_prompt_template text NOT NULL,
    default_model text DEFAULT 'claude-sonnet-4-5-20250929',
    temperature numeric DEFAULT 0.7 CHECK (temperature >= 0::numeric AND temperature <= 1::numeric),
    max_tokens integer DEFAULT 4096 CHECK (max_tokens > 0),
    input_schema jsonb DEFAULT '{}'::jsonb,
    output_schema jsonb DEFAULT '{}'::jsonb,
    output_format text DEFAULT 'json' CHECK (output_format IN ('json', 'markdown', 'text')),
    version integer DEFAULT 1 CHECK (version > 0),
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    default_viewer_code text
);CREATE TABLE IF NOT EXISTS prompt_executions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_template_id uuid REFERENCES prompt_templates(id),
    llm_interface_id uuid,
    stakeholder_id uuid REFERENCES stakeholders(id),
    workflow_instance_id uuid REFERENCES workflow_instances(id),
    task_id uuid REFERENCES instance_tasks(id),
    input_data jsonb NOT NULL,
    rendered_prompt text,
    model_used text,
    temperature numeric,
    max_tokens integer,
    output_data jsonb,
    raw_response text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message text,
    tokens_input integer,
    tokens_output integer,
    cost_estimate numeric,
    duration_ms integer,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_contexts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('CTX-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    name text NOT NULL,
    description text,
    context_type text DEFAULT 'custom' CHECK (context_type IN ('stakeholder', 'workflow', 'campaign', 'custom')),
    llm_interface_id uuid NOT NULL,
    system_prompt text,
    context_data jsonb DEFAULT '{}'::jsonb,
    available_functions text[] DEFAULT '{}'::text[],
    available_stakeholders uuid[] DEFAULT '{}'::uuid[],
    is_global boolean DEFAULT false,
    related_stakeholder_id uuid REFERENCES stakeholders(id),
    related_workflow_id uuid REFERENCES workflows(id),
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid REFERENCES site_settings(app_uuid)
);

CREATE TABLE IF NOT EXISTS ai_agent_assignments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_code text NOT NULL,
    agent_name text NOT NULL,
    llm_interface_id uuid NOT NULL,
    function_code text NOT NULL,
    required_capability_id uuid REFERENCES capabilities(id),
    min_proficiency_level text DEFAULT 'intermediate',
    requires_approval_for_execution boolean DEFAULT false,
    can_operate_autonomously boolean DEFAULT false,
    success_rate_threshold numeric DEFAULT 95,
    max_concurrent_executions integer DEFAULT 5,
    rate_limit_per_hour integer DEFAULT 1000,
    is_active boolean DEFAULT true,
    total_executions integer DEFAULT 0,
    successful_executions integer DEFAULT 0,
    failed_executions integer DEFAULT 0,
    last_execution_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid REFERENCES site_settings(app_uuid)
);

CREATE TABLE IF NOT EXISTS ai_execution_policies (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    applies_to_functions text[] DEFAULT '{}'::text[],
    applies_to_agents text[] DEFAULT '{}'::text[],
    applies_to_stakeholders uuid[] DEFAULT '{}'::uuid[],
    requires_human_oversight boolean DEFAULT false,
    approval_required_for_cost_over numeric,
    approval_required_for_data_access boolean DEFAULT false,
    data_access_level text DEFAULT 'standard' CHECK (data_access_level IN ('minimal', 'standard', 'full')),
    can_modify_data boolean DEFAULT false,
    can_delete_data boolean DEFAULT false,
    enabled_hours_start time,
    enabled_hours_end time,
    max_daily_executions integer,
    max_daily_cost numeric,
    log_all_executions boolean DEFAULT true,
    log_ai_reasoning boolean DEFAULT false,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid REFERENCES site_settings(app_uuid)
);CREATE TABLE IF NOT EXISTS function_calls_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('CALL-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    agent_context_id uuid REFERENCES agent_contexts(id),
    function_code text NOT NULL,
    llm_interface_id uuid NOT NULL,
    ai_model text,
    ai_message text,
    execution_agent_id uuid REFERENCES stakeholders(id),
    request_data jsonb DEFAULT '{}'::jsonb,
    parameters jsonb DEFAULT '{}'::jsonb,
    response_data jsonb DEFAULT '{}'::jsonb,
    execution_status text DEFAULT 'queued' CHECK (execution_status IN ('queued', 'running', 'completed', 'failed', 'timeout')),
    error_message text,
    result jsonb DEFAULT '{}'::jsonb,
    requested_at timestamptz DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz,
    duration_ms integer,
    tokens_used integer,
    requires_approval boolean DEFAULT false,
    approved_by_id uuid,
    approval_status text CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approval_notes text,
    approved_at timestamptz,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    app_uuid uuid REFERENCES site_settings(app_uuid)
);

-- Capabilities
CREATE TABLE IF NOT EXISTS capabilities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    label text NOT NULL,
    category text NOT NULL,
    description text,
    is_certifiable boolean DEFAULT false,
    certification_body text,
    certification_url text,
    requires_renewal boolean DEFAULT false,
    renewal_period_months integer,
    parent_capability_id uuid REFERENCES capabilities(id),
    function_code text,
    required_for_functions text[] DEFAULT '{}'::text[],
    vcef_relevance text[] DEFAULT '{}'::text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    app_uuid uuid REFERENCES site_settings(app_uuid)
);

CREATE TABLE IF NOT EXISTS stakeholder_capabilities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    capability_id uuid NOT NULL REFERENCES capabilities(id),
    proficiency_level text NOT NULL DEFAULT 'beginner' CHECK (proficiency_level IN ('awareness', 'beginner', 'intermediate', 'advanced', 'expert')),
    is_certified boolean DEFAULT false,
    certification_reference text,
    certified_by uuid,
    certified_at timestamptz,
    expires_at timestamptz,
    renewal_reminder_sent boolean DEFAULT false,
    evidence_url text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid REFERENCES site_settings(app_uuid)
);-- Relationships
CREATE TABLE IF NOT EXISTS relationship_types (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    label text NOT NULL,
    description text,
    is_bidirectional boolean DEFAULT false,
    reverse_label text,
    vcef_relevance text[] DEFAULT '{}'::text[],
    created_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid),
    scope text DEFAULT 'general' CHECK (scope IN ('general', 'specific')),
    specific_stakeholder_id uuid REFERENCES stakeholders(id)
);CREATE TABLE IF NOT EXISTS relationships (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('REL-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    from_stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    to_stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    relationship_type_id uuid NOT NULL REFERENCES relationship_types(id),
    strength integer CHECK (strength >= 1 AND strength <= 10),
    duration_months integer,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'terminated')),
    start_date timestamptz DEFAULT now(),
    end_date timestamptz,
    last_interaction timestamptz,
    interaction_count integer DEFAULT 0,
    value_context jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid)
);

-- Workflows (legacy)
CREATE TABLE IF NOT EXISTS workflows (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('WF-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    template_id uuid NOT NULL REFERENCES workflow_templates(id),
    name text NOT NULL,
    description text,
    related_stakeholder_id uuid REFERENCES stakeholders(id),
    owner_id uuid NOT NULL REFERENCES stakeholders(id),
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled', 'failed')),
    current_stage_index integer DEFAULT 0,
    progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    started_at timestamptz,
    due_date timestamptz,
    completed_at timestamptz,
    workflow_data jsonb DEFAULT '{}'::jsonb,
    final_outcome jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid)
);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id uuid NOT NULL REFERENCES workflows(id),
    stage_index integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('manual', 'automated', 'approval', 'notification', 'conditional')),
    description text,
    assigned_to_role text,
    assigned_to_stakeholder_id uuid REFERENCES stakeholders(id),
    required_capabilities text[] DEFAULT '{}'::text[],
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'in_progress', 'completed', 'skipped', 'failed')),
    started_at timestamptz,
    completed_at timestamptz,
    due_at timestamptz,
    estimated_duration_minutes integer,
    depends_on_steps integer[] DEFAULT '{}'::integer[],
    blocks_steps integer[] DEFAULT '{}'::integer[],
    condition_logic jsonb DEFAULT '{}'::jsonb,
    requires_approval boolean DEFAULT false,
    approval_status text CHECK (approval_status IN ('pending', 'approved', 'rejected', 'escalated')),
    approved_by_id uuid,
    approval_notes text,
    approved_at timestamptz,
    step_data jsonb DEFAULT '{}'::jsonb,
    step_outcome jsonb DEFAULT '{}'::jsonb,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid)
);CREATE TABLE IF NOT EXISTS activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id uuid NOT NULL,
    activity_code text NOT NULL,
    activity_name text NOT NULL,
    status text DEFAULT 'pending',
    owner text,
    due_date timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    prerequisite_activity_ids uuid[]
);CREATE TABLE IF NOT EXISTS activity_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_template_id uuid,
    activity_code text NOT NULL,
    activity_name text NOT NULL,
    owner text,
    sequence_order integer,
    prerequisite_activity_codes text[],
    estimated_days integer,
    created_at timestamp DEFAULT now()
);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    owner_stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    app_uuid uuid NOT NULL REFERENCES applications(id),
    primary_role_code text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz,
    created_from_template_id uuid REFERENCES workspace_templates(id),
    tags text[] DEFAULT '{}'::text[],
    is_public boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS workspace_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code text UNIQUE NOT NULL,
    template_name text NOT NULL,
    description text,
    dashboard_config_id uuid REFERENCES workspace_dashboard_configurations(id),
    file_structure_template_id uuid REFERENCES workspace_file_structure_templates(id),
    business_services_config_id uuid REFERENCES workspace_business_services_configurations(id),
    app_uuid uuid NOT NULL REFERENCES applications(id),
    applicable_roles text[] NOT NULL DEFAULT '{}'::text[],
    category text,
    icon_name text,
    preview_image_url text,
    is_featured boolean DEFAULT false,
    is_system_template boolean DEFAULT false,
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    created_by uuid REFERENCES stakeholders(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_dashboard_configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_name text NOT NULL,
    description text,
    dashboard_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES stakeholders(id),
    app_uuid uuid NOT NULL REFERENCES applications(id),
    version text DEFAULT '1.0',
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_file_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name text NOT NULL,
    description text,
    structure_definition jsonb NOT NULL,
    app_uuid uuid NOT NULL REFERENCES applications(id),
    applicable_roles text[] DEFAULT '{}'::text[],
    created_by uuid REFERENCES stakeholders(id),
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_business_services_configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_name text NOT NULL,
    description text,
    services_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    app_uuid uuid NOT NULL REFERENCES applications(id),
    created_by uuid REFERENCES stakeholders(id),
    is_active boolean DEFAULT true,
    version text DEFAULT '1.0',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id),
    dashboard_config_id uuid REFERENCES workspace_dashboard_configurations(id),
    file_structure_template_id uuid REFERENCES workspace_file_structure_templates(id),
    business_services_config_id uuid REFERENCES workspace_business_services_configurations(id),
    applied_at timestamptz NOT NULL DEFAULT now(),
    applied_by uuid REFERENCES stakeholders(id),
    is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS workspace_access_control (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id),
    stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    access_role text NOT NULL CHECK (access_role IN ('owner', 'collaborator', 'consultant', 'viewer')),
    permissions jsonb DEFAULT '{}'::jsonb,
    invited_by uuid REFERENCES stakeholders(id),
    invited_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    invitation_status text NOT NULL DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined', 'revoked')),
    granted_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    last_accessed_at timestamptz
);

-- Nodes (file system)
CREATE TABLE IF NOT EXISTS nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('file', 'folder', 'component')),
    parent_id uuid REFERENCES nodes(id),
    owner_id uuid NOT NULL REFERENCES stakeholders(id),
    file_storage_path text,
    size_bytes integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid,
    reference text UNIQUE DEFAULT ((('NODE-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((gen_random_uuid())::text, 1, 8)),
    component_id uuid REFERENCES components_registry(id),
    component_config jsonb DEFAULT '{}'::jsonb,
    component_state jsonb DEFAULT '{}'::jsonb,
    mime_type text,
    description text,
    tags text[] DEFAULT '{}'::text[],
    is_shared boolean DEFAULT false,
    associated_workflow_id uuid,
    activity_code text,
    created_by uuid
);

CREATE TABLE IF NOT EXISTS node_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL REFERENCES nodes(id),
    shared_with_stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    permission text NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
    shared_by uuid NOT NULL REFERENCES stakeholders(id),
    shared_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid)
);

-- Components registry
CREATE TABLE IF NOT EXISTS components_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    component_code text UNIQUE NOT NULL,
    component_name text NOT NULL,
    description text,
    icon_name text,
    route_path text,
    widget_component_name text NOT NULL,
    required_permissions text[] DEFAULT '{}'::text[],
    required_role_codes text[] DEFAULT '{}'::text[],
    min_proficiency_level text DEFAULT 'awareness',
    supports_params boolean DEFAULT true,
    default_params jsonb DEFAULT '{}'::jsonb,
    parameters_schema jsonb DEFAULT '{}'::jsonb,
    creates_nodes boolean DEFAULT false,
    node_type_created text,
    launch_in_modal boolean DEFAULT false,
    launch_in_sidebar boolean DEFAULT false,
    supports_full_screen boolean DEFAULT true,
    data_fetch_query text,
    realtime_updates boolean DEFAULT false,
    is_active boolean DEFAULT true,
    is_beta boolean DEFAULT false,
    version text DEFAULT '1.0',
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid),
    registry_type text DEFAULT 'UI_COMPONENT' CHECK (registry_type IN ('UI_COMPONENT', 'AI_FUNCTION', 'WORKFLOW_TASK', 'ADMIN_TOOL', 'AI_VIEWER')),
    deleted_at timestamptz,
    last_modified_by uuid REFERENCES users(id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notification_templates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    title_template text NOT NULL,
    message_template text NOT NULL,
    action_text_template text,
    action_url_template text,
    notification_type text,
    category text,
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    channels text[] DEFAULT '{in_app}'::text[],
    trigger_event text,
    condition_logic jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    notification_type text,
    category text,
    enabled_channels text[] DEFAULT '{in_app}'::text[],
    disabled_channels text[] DEFAULT '{}'::text[],
    quiet_hours_start time,
    quiet_hours_end time,
    timezone text DEFAULT 'UTC',
    digest_frequency text DEFAULT 'immediate' CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
    max_per_day integer DEFAULT 100,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    notification_type text,
    title text NOT NULL,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    app_uuid uuid NOT NULL REFERENCES applications(id)
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaign_types (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    funnel_stages jsonb NOT NULL DEFAULT '[]'::jsonb,
    auto_advance_enabled boolean DEFAULT false,
    auto_advance_days integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('CAMP-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    campaign_type_id uuid NOT NULL REFERENCES campaign_types(id),
    name text NOT NULL,
    description text,
    owner_id uuid NOT NULL REFERENCES stakeholders(id),
    team_members uuid[] DEFAULT '{}'::uuid[],
    status text DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),
    launch_date date,
    end_date date,
    target_count integer,
    actual_count integer DEFAULT 0,
    success_rate numeric DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid)
);

CREATE TABLE IF NOT EXISTS campaign_opportunities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('OPP-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    campaign_id uuid NOT NULL REFERENCES campaigns(id),
    stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    current_stage_name text,
    stage_entered_at timestamptz DEFAULT now(),
    status text DEFAULT 'active' CHECK (status IN ('active', 'converted', 'rejected', 'dormant', 'lost')),
    engagement_level text DEFAULT 'cold' CHECK (engagement_level IN ('cold', 'warm', 'hot', 'engaged', 'inactive')),
    last_interaction timestamptz,
    estimated_value numeric,
    actual_value numeric,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid REFERENCES site_settings(app_uuid)
);

CREATE TABLE IF NOT EXISTS campaign_interactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('INT-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    opportunity_id uuid NOT NULL REFERENCES campaign_opportunities(id),
    interaction_type text NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'message', 'proposal', 'event', 'demo', 'other')),
    direction text CHECK (direction IN ('inbound', 'outbound')),
    subject text,
    notes text,
    outcome text,
    initiated_by_id uuid REFERENCES stakeholders(id),
    assigned_to_id uuid REFERENCES stakeholders(id),
    interaction_date timestamptz DEFAULT now(),
    duration_minutes integer,
    next_action text,
    next_follow_up_date date,
    follow_up_completed boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid)
);

-- Blog and content
CREATE TABLE IF NOT EXISTS blog_posts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('BLOG-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    content text,
    category text,
    tags text[] DEFAULT '{}'::text[],
    author_id uuid,
    featured_image_url text,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
    is_featured boolean DEFAULT false,
    published_at timestamptz,
    scheduled_for timestamptz,
    view_count integer DEFAULT 0,
    seo_title text,
    seo_description text,
    seo_keywords text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid)
);

-- Enquiries
CREATE TABLE IF NOT EXISTS enquiries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference text UNIQUE NOT NULL DEFAULT ((('ENQ-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((uuid_generate_v4())::text, 1, 8)),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    organisation text,
    subject text NOT NULL,
    message text NOT NULL,
    enquiry_type text DEFAULT 'general' CHECK (enquiry_type IN ('general', 'partnership', 'licensing', 'implementation', 'support', 'other')),
    status text DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'resolved', 'closed')),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to uuid,
    assigned_at timestamptz,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    resolved_at timestamptz,
    app_uuid uuid NOT NULL REFERENCES applications(id)
);

-- Page settings
CREATE TABLE IF NOT EXISTS page_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_name varchar(100) NOT NULL,
    hero_video_url text,
    hero_video_public_id text,
    hero_title text NOT NULL DEFAULT 'Value Chain Studio',
    hero_subtitle text NOT NULL DEFAULT 'Systematic business transformation through Value Chain Excellence Framework',
    hero_description text,
    hero_cta_primary_text varchar(50) DEFAULT 'Get Started',
    hero_cta_secondary_text varchar(50) DEFAULT 'Learn More',
    info_section_title text DEFAULT 'What is VC Studio?',
    info_section_subtitle text,
    info_block_1_title varchar(200),
    info_block_1_content text,
    info_block_2_title varchar(200),
    info_block_2_content text,
    info_highlight_text text,
    gallery_section_title text DEFAULT 'Our Work in Action',
    gallery_section_subtitle text,
    is_published boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),
    app_uuid uuid NOT NULL REFERENCES site_settings(app_uuid)
);

CREATE TABLE IF NOT EXISTS page_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_settings_id uuid NOT NULL REFERENCES page_settings(id),
    cloudinary_url text NOT NULL,
    public_id text NOT NULL,
    alt_text text NOT NULL,
    title text,
    caption text,
    display_order integer NOT NULL DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    app_uuid uuid REFERENCES site_settings(app_uuid)
);

CREATE TABLE IF NOT EXISTS cta_buttons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_uuid uuid NOT NULL REFERENCES applications(id),
    label text NOT NULL,
    href text NOT NULL,
    variant text NOT NULL DEFAULT 'primary' CHECK (variant IN ('primary', 'secondary', 'outline', 'ghost')),
    icon_name text,
    analytics_event text,
    is_active boolean DEFAULT true,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS page_cta_placements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_settings_id uuid NOT NULL REFERENCES page_settings(id),
    cta_button_id uuid NOT NULL REFERENCES cta_buttons(id),
    section text NOT NULL CHECK (section IN ('hero', 'body', 'footer', 'sidebar', 'custom')),
    sort_order integer DEFAULT 0,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard routes
CREATE TABLE IF NOT EXISTS dashboard_routes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_type_id uuid NOT NULL REFERENCES stakeholder_types(id),
    role_id uuid REFERENCES roles(id),
    route_path text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stakeholder_type_roles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_type_id uuid NOT NULL REFERENCES stakeholder_types(id),
    role_id uuid NOT NULL REFERENCES roles(id),
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- MCP endpoints
CREATE TABLE IF NOT EXISTS mcp_endpoints (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    endpoint_url text NOT NULL,
    endpoint_type text DEFAULT 'http' CHECK (endpoint_type IN ('http', 'ws', 'stdio', 'sse')),
    requires_authentication boolean DEFAULT false,
    auth_type text DEFAULT 'none' CHECK (auth_type IN ('api_key', 'oauth2', 'bearer_token', 'none')),
    auth_token_ref text,
    protocol_version text DEFAULT '1.0',
    supported_methods text[] DEFAULT '{}'::text[],
    available_resources jsonb DEFAULT '{}'::jsonb,
    available_tools jsonb DEFAULT '{}'::jsonb,
    supports_sampling boolean DEFAULT false,
    supports_prompts boolean DEFAULT false,
    max_request_size integer DEFAULT 1000000,
    is_active boolean DEFAULT true,
    last_health_check timestamptz,
    health_status text DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    uptime_percentage numeric DEFAULT 100,
    total_requests integer DEFAULT 0,
    failed_requests integer DEFAULT 0,
    avg_response_time_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Configuration
CREATE TABLE IF NOT EXISTS configuration (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    description text,
    category text,
    is_sensitive boolean DEFAULT false,
    updated_by uuid,
    updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    app_uuid uuid REFERENCES site_settings(app_uuid)
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    entity_reference text,
    changes jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    status text DEFAULT 'completed' CHECK (status IN ('initiated', 'in_progress', 'completed', 'failed')),
    error_message text,
    duration_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    app_uuid uuid REFERENCES site_settings(app_uuid)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    stakeholder_id uuid REFERENCES stakeholders(id),
    performed_by uuid REFERENCES stakeholders(id),
    details jsonb,
    created_at timestamptz DEFAULT now(),
    app_uuid uuid,
    workspace_id uuid REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS file_audit_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    file_path text NOT NULL,
    action text NOT NULL CHECK (action IN ('upload', 'delete', 'view', 'download', 'move', 'rename')),
    performed_by uuid NOT NULL REFERENCES auth.users(id),
    performed_by_name text,
    metadata jsonb DEFAULT '{}'::jsonb,
    performed_at timestamptz DEFAULT now()
);

-- Policies
CREATE TABLE IF NOT EXISTS policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_type varchar(50) NOT NULL,
    title varchar(255) NOT NULL,
    content text NOT NULL,
    version integer DEFAULT 1,
    effective_date timestamp DEFAULT CURRENT_TIMESTAMP,
    app_uuid uuid,
    is_active boolean DEFAULT true,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Backup table
CREATE TABLE IF NOT EXISTS stakeholders_core_config_backup_20251118_224835 (
    id uuid,
    name text,
    email text,
    old_core_config jsonb,
    backup_timestamp timestamptz
);

-- ============================================================================
-- PRIMARY KEYS (already defined in CREATE TABLE statements above)
-- ============================================================================

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS (already defined in CREATE TABLE statements above)
-- ============================================================================

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Add indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_stakeholders_email ON stakeholders(email);
CREATE INDEX IF NOT EXISTS idx_stakeholders_stakeholder_type_id ON stakeholders(stakeholder_type_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_app_code ON workflow_instances(app_code);
CREATE INDEX IF NOT EXISTS idx_instance_tasks_status ON instance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_instance_tasks_workflow_instance_id ON instance_tasks(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_nodes_owner_id ON nodes(owner_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_relationships_from_stakeholder ON relationships(from_stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to_stakeholder ON relationships(to_stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_notifications_stakeholder_id ON notifications(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_app_uuid ON blog_posts(app_uuid);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_app_uuid ON enquiries(app_uuid);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Note: Views are defined in the database. For complete view definitions,
-- please use pg_dump or query information_schema.views

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- RLS is enabled on many tables. For complete RLS policy definitions,
-- please use pg_dump or query pg_policies

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE site_settings IS 'Application-specific site configuration and branding';
COMMENT ON TABLE stakeholders IS 'Core stakeholder entity representing users, organizations, and other entities';
COMMENT ON TABLE workflows IS 'Legacy workflow system - use workflow_instances for new workflows';
COMMENT ON TABLE workflow_instances IS 'Runtime instances of workflow executions';
COMMENT ON TABLE instance_tasks IS 'Individual tasks within workflow instances';
COMMENT ON TABLE function_registry IS 'Registry of all executable functions available in workflows';
COMMENT ON TABLE nodes IS 'File system nodes representing files, folders, and components';
COMMENT ON TABLE components_registry IS 'Component registry including AI_VIEWER types for rendering AI prompt outputs';
COMMENT ON TABLE workspaces IS 'Core workspace entity - one per (stakeholder, app, role) combination';
COMMENT ON TABLE workspace_templates IS 'Complete workspace templates combining dashboard, files, and services';
COMMENT ON TABLE prompt_templates IS 'Library of AI prompts for FLM creation and document generation';
COMMENT ON TABLE prompt_executions IS 'Execution log for all AI prompt calls with metrics';
COMMENT ON TABLE service_configurations IS 'Service definitions for both REAL (external API) and MOCK (simulated) services';
COMMENT ON TABLE service_task_queue IS 'Queue of SERVICE_TASK work tokens awaiting background worker processing';
COMMENT ON TABLE service_execution_logs IS 'Audit trail of all service executions (REAL and MOCK) with performance metrics';
COMMENT ON TABLE workflow_execution_queue IS 'Queue for async workflow execution processing after task completion or other triggers';
COMMENT ON TABLE workflow_history IS 'Immutable audit log of all workflow execution events';
COMMENT ON TABLE instance_context IS 'Accumulated execution context for workflow instances. Supports versioning for rollback and audit';
COMMENT ON TABLE workflow_definitions IS 'Workflow blueprints/templates that define business process structures';
COMMENT ON TABLE file_audit_log IS 'Audit trail for all file operations, especially admin access';
COMMENT ON TABLE workspace_access_control IS 'Multi-user access control for workspace collaboration';
COMMENT ON TABLE workspace_configurations IS 'Junction table linking workspaces to their active configuration set';
COMMENT ON TABLE workspace_dashboard_configurations IS 'Pre-configured dashboard layouts for different VC Studio roles';
COMMENT ON TABLE workspace_file_structure_templates IS 'Pre-defined folder hierarchies for various VC Studio workflows';
COMMENT ON TABLE workspace_business_services_configurations IS 'Business logic configurations for VC Studio workflows and automation';
COMMENT ON COLUMN stakeholders.core_config IS 'JSON configuration defining dashboard widgets, menu items, and role-specific settings';
COMMENT ON COLUMN nodes.reference IS 'Unique human-readable identifier for the node';
COMMENT ON COLUMN nodes.component_id IS 'Reference to component in components_registry (for type=component)';
COMMENT ON COLUMN nodes.component_config IS 'Instance-specific configuration for component';
COMMENT ON COLUMN nodes.component_state IS 'Runtime state (last opened, position, etc.)';
COMMENT ON COLUMN nodes.mime_type IS 'MIME type for files (e.g., application/pdf)';
COMMENT ON COLUMN nodes.description IS 'User-provided description';
COMMENT ON COLUMN nodes.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN nodes.is_shared IS 'Whether this node is shared with other users';
COMMENT ON COLUMN nodes.associated_workflow_id IS 'Workflow instance that created/uses this node';
COMMENT ON COLUMN nodes.activity_code IS 'VCEF activity code that created this node';
COMMENT ON COLUMN nodes.created_by IS 'User who created this node';
COMMENT ON COLUMN workflow_instances.current_node_id IS 'Current position in the workflow execution. Updated as workflow progresses through nodes.';
COMMENT ON COLUMN workflow_instances.instance_name IS 'User-provided name for this workflow instance to distinguish it from other instances of the same template';
COMMENT ON COLUMN instance_tasks.function_code IS 'References the function_registry to determine how this task should be executed';
COMMENT ON COLUMN instance_tasks.assigned_to IS 'For USER_TASK types, this indicates which stakeholder is assigned to complete the task';
COMMENT ON COLUMN function_registry.app_code IS 'Application code. NULL for shared functions that can be used across applications.';
COMMENT ON COLUMN function_registry.endpoint_or_path IS 'For SERVICE_TASK: API endpoint URL. For AI_AGENT_TASK: agent configuration path.';
COMMENT ON COLUMN function_registry.ui_widget_id IS 'UI widget identifier for rendering user task interfaces';
COMMENT ON COLUMN workflow_execution_queue.trigger_type IS 'Type of event that triggered the queue item (TASK_COMPLETED, MANUAL, SCHEDULED)';
COMMENT ON COLUMN workflow_execution_queue.trigger_data IS 'Additional data about the trigger event (e.g., task_id, node_id)';
COMMENT ON COLUMN workflow_execution_queue.status IS 'Current status of the queue item (PENDING, PROCESSING, COMPLETED, FAILED)';
COMMENT ON COLUMN workflow_execution_queue.retry_count IS 'Number of times this queue item has been retried';
COMMENT ON COLUMN workflow_history.event_type IS 'Type of event that occurred in the workflow execution';
COMMENT ON COLUMN workflow_history.metadata IS 'Additional event-specific data stored as JSON for flexibility';
COMMENT ON COLUMN service_task_queue.instance_id IS 'References workflow_instances(id) - the workflow instance executing this service task';
COMMENT ON COLUMN service_task_queue.task_id IS 'References instance_tasks(id) - the specific task node within the workflow';
COMMENT ON COLUMN service_task_queue.status IS 'PENDING = awaiting execution, RUNNING = currently executing, COMPLETED = success, FAILED = max retries exceeded';
COMMENT ON COLUMN service_execution_logs.instance_id IS 'References workflow_instances(id) - the workflow instance that triggered this service call';
COMMENT ON COLUMN service_execution_logs.task_id IS 'References instance_tasks(id) - the specific task that triggered this service call';
COMMENT ON COLUMN service_execution_logs.status IS 'SUCCESS = completed successfully, FAILED = execution failed, TIMEOUT = exceeded timeout, ERROR = unexpected error';
COMMENT ON COLUMN service_execution_logs.execution_time_ms IS 'Time taken for service call in milliseconds';
COMMENT ON COLUMN service_configurations.service_type IS 'REAL = external API call, MOCK = simulated response';
COMMENT ON COLUMN service_configurations.authentication IS 'Authentication configuration for REAL services (API keys, headers, etc.)';
COMMENT ON COLUMN service_configurations.mock_definition IS 'Mock response definition with success_response and error_scenarios';
COMMENT ON COLUMN prompt_templates.prompt_code IS 'Unique identifier for the prompt (e.g., BVS_TO_DBS)';
COMMENT ON COLUMN prompt_templates.category IS 'Prompt category: FLM, AGM, DOCUMENT, or ANALYSIS';
COMMENT ON COLUMN prompt_templates.user_prompt_template IS 'Prompt template with {{variable}} placeholders';
COMMENT ON COLUMN prompt_templates.default_model IS 'Default Claude model: sonnet, opus, or haiku';
COMMENT ON COLUMN prompt_templates.output_format IS 'Expected output format: json, markdown, or text';
COMMENT ON COLUMN prompt_executions.input_data IS 'Variables passed to the prompt template';
COMMENT ON COLUMN prompt_executions.rendered_prompt IS 'Final prompt sent to Claude after variable substitution';
COMMENT ON COLUMN prompt_executions.output_data IS 'Parsed and validated output from Claude';
COMMENT ON COLUMN prompt_executions.cost_estimate IS 'Estimated cost in USD based on token usage';
COMMENT ON COLUMN workspace_access_control.access_role IS 'User role in workspace: owner (full control), collaborator (edit), consultant (suggest), viewer (read-only)';
COMMENT ON COLUMN workspace_access_control.permissions IS 'JSONB structure with granular permission flags';
COMMENT ON COLUMN workspace_access_control.invitation_status IS 'Invitation workflow status: pending, accepted, declined, or revoked';
COMMENT ON COLUMN workspace_access_control.expires_at IS 'Optional expiration date for time-limited access';
COMMENT ON COLUMN workspace_access_control.last_accessed_at IS 'Timestamp of last workspace access for activity tracking';
COMMENT ON COLUMN workspaces.reference IS 'Unique workspace reference in format WKS-XXXXXX';
COMMENT ON COLUMN workspaces.primary_role_code IS 'Role context in which this workspace operates (e.g., investor, administrator)';
COMMENT ON COLUMN workspaces.status IS 'Workspace lifecycle status: active, archived, or suspended';
COMMENT ON COLUMN workspaces.created_from_template_id IS 'Reference to workspace_templates if created from template';
COMMENT ON COLUMN workspace_templates.template_code IS 'Unique code identifier (e.g., VC_STUDIO_INVESTOR, BUILDBID_CONTRACTOR)';
COMMENT ON COLUMN workspace_templates.applicable_roles IS 'Array of role codes that can use this template';
COMMENT ON COLUMN workspace_templates.category IS 'Template category for organization (e.g., Investment Management, Project Management)';
COMMENT ON COLUMN workspace_templates.is_featured IS 'Featured templates shown prominently in UI';
COMMENT ON COLUMN workspace_templates.is_system_template IS 'System templates cannot be deleted by users';
COMMENT ON COLUMN workspace_templates.usage_count IS 'Number of workspaces created from this template';
COMMENT ON COLUMN workspace_configurations.workspace_id IS 'Reference to the workspace using this configuration';
COMMENT ON COLUMN workspace_configurations.dashboard_config_id IS 'Active dashboard configuration (NULL = use defaults)';
COMMENT ON COLUMN workspace_configurations.file_structure_template_id IS 'File structure template used (NULL = no template applied)';
COMMENT ON COLUMN workspace_configurations.business_services_config_id IS 'Active business services configuration (NULL = use defaults)';
COMMENT ON COLUMN workspace_configurations.is_active IS 'Only one configuration can be active per workspace at a time';
COMMENT ON COLUMN workspace_dashboard_configurations.dashboard_config IS 'JSONB structure matching stakeholders.core_config pattern for dashboard layout';
COMMENT ON COLUMN workspace_file_structure_templates.structure_definition IS 'JSONB hierarchical structure defining folders and subfolders to create';
COMMENT ON COLUMN workspace_file_structure_templates.applicable_roles IS 'Array of role codes that can use this template';
COMMENT ON COLUMN workspace_business_services_configurations.services_config IS 'JSONB structure defining workflows, notifications, and automation rules';
COMMENT ON COLUMN file_audit_log.file_path IS 'Full path to the file in the stakeholder file system';
COMMENT ON COLUMN file_audit_log.action IS 'Type of file operation performed';
COMMENT ON COLUMN file_audit_log.metadata IS 'Additional context (file size, category, etc.)';
COMMENT ON COLUMN audit_logs.action IS 'Action types include: workspace_created, workspace_updated, workspace_archived, workspace_restored, access_granted, access_revoked, access_updated, config_changed, template_applied, file_structure_initialized, collaborator_invited, collaborator_accepted, collaborator_declined';
COMMENT ON COLUMN audit_logs.workspace_id IS 'Reference to workspace for workspace-related audit events';
COMMENT ON COLUMN relationship_types.app_uuid IS 'App-specific relationship type - allows different apps to define different relationship taxonomies';
COMMENT ON COLUMN relationships.app_uuid IS 'App-specific relationship - stakeholder relationships are scoped to each application';
COMMENT ON COLUMN stakeholder_roles.app_uuid IS 'App-specific role assignment - allows same stakeholder to have different roles in different apps';
COMMENT ON COLUMN roles.app_uuid IS 'App-specific role definition - allows different apps to have different role configurations';
COMMENT ON COLUMN roles.workspace_template_id IS 'Optional workspace template to use when creating workspaces for users with this role';
COMMENT ON COLUMN llm_interfaces.provider IS 'LLM provider: anthropic, openai, deepseek, or gemini';
COMMENT ON COLUMN llm_interfaces.api_key_enc IS 'Encrypted API key using AES-256-GCM (encrypted via Node.js encryption.ts before storage)';
COMMENT ON COLUMN llm_interfaces.base_url IS 'Optional custom base URL (e.g., https://api.deepseek.com for DeepSeek)';
COMMENT ON COLUMN llm_interfaces.is_default IS 'One default interface per provider (shared across all apps)';
COMMENT ON COLUMN llm_interfaces IS 'LLM provider configurations with encrypted API keys. Supports multiple providers per application.';
COMMENT ON COLUMN workflow_templates.definition IS 'Workflow structure: nodes (tasks, gateways, events), transitions (arrows with conditions), and metadata';
COMMENT ON COLUMN workflow_definitions.model_structure IS 'Complete workflow definition in JSON format containing nodes, edges, conditions, and execution logic';
COMMENT ON COLUMN workflow_definitions.l4_operation_code IS 'Optional link to L4 operation definitions for integration with higher-level business operations';
COMMENT ON COLUMN workflow_definitions IS 'Workflow blueprints/templates that define business process structures. Each workflow can have multiple versions for evolution.';
COMMENT ON COLUMN workflow_instances IS 'Runtime instances of workflow executions. Each row represents a single execution of a workflow definition.';
COMMENT ON COLUMN instance_tasks IS 'Individual tasks within workflow instances. Represents work tokens that need to be executed.';
COMMENT ON COLUMN cta_buttons IS 'Stores CTA button definitions - the "what" (label, href, styling)';
COMMENT ON COLUMN page_cta_placements IS 'Stores CTA button placements - the "where" (which page, which section, sort order)';

-- ============================================================================
-- END OF SCHEMA DUMP
-- ============================================================================
-- 
-- Note: This schema dump includes table definitions, basic constraints, and indexes.
-- For complete schema including all foreign keys, check constraints, unique constraints,
-- views, functions, triggers, and RLS policies, please use:
--   pg_dump --schema-only --no-owner --no-acl <database_url>
-- 
-- Or refer to the TypeScript types file: supabase_types_ihebxuoyklkaimjtcwwq.ts
-- ============================================================================