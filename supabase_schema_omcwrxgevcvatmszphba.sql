-- ============================================
-- SCHEMA DUMP FOR PROJECT: omcwrxgevcvatmszphba
-- Generated: 2025-01-30
-- ============================================
-- 
-- This file contains the complete database schema including:
-- - Table definitions
-- - Primary keys
-- - Foreign keys
-- - Unique constraints
-- - Check constraints
-- - Indexes
-- - Views
-- - RLS status
--
-- Note: Dynamic holding tables (holding_*) are excluded from this dump
-- as they are created dynamically based on uploads.
-- ============================================

-- ============================================
-- TABLES
-- ============================================

-- Table: address
CREATE TABLE IF NOT EXISTS public.address (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL,
  location_type_id UUID NOT NULL,
  country_code TEXT NOT NULL,
  full_address JSONB NOT NULL,
  what3words TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_reference TEXT,
  changes JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: contact_info
CREATE TABLE IF NOT EXISTS public.contact_info (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL,
  contact_type TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: enrichment_pathways
CREATE TABLE IF NOT EXISTS public.enrichment_pathways (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  estimated_duration_minutes INTEGER,
  usage_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: holding_table_templates
CREATE TABLE IF NOT EXISTS public.holding_table_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT (('TPL-' || to_char(now(), 'YYYYMMDD')) || '-' || substr(gen_random_uuid()::text, 1, 8)),
  template_code TEXT NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,
  column_definitions JSONB NOT NULL,
  mapping_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: holding_tables
CREATE TABLE IF NOT EXISTS public.holding_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT (('HOLD-' || to_char(now(), 'YYYYMMDD')) || '-' || substr(gen_random_uuid()::text, 1, 8)),
  table_name TEXT NOT NULL,
  physical_table_name TEXT NOT NULL,
  template_id UUID,
  upload_date TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID,
  file_name TEXT,
  file_size_bytes INTEGER,
  record_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: individual
CREATE TABLE IF NOT EXISTS public.individual (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL,
  name JSONB NOT NULL,
  date_of_birth DATE,
  sex_assigned_at_birth TEXT,
  gender_identity TEXT,
  pronoun TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: industry
CREATE TABLE IF NOT EXISTS public.industry (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  section TEXT,
  division TEXT,
  group_code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: llm_interfaces
CREATE TABLE IF NOT EXISTS public.llm_interfaces (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  provider TEXT NOT NULL DEFAULT 'anthropic',
  default_model TEXT NOT NULL,
  api_key_enc TEXT NOT NULL,
  base_url TEXT,
  supports_vision BOOLEAN DEFAULT false,
  supports_tools BOOLEAN DEFAULT false,
  supports_json BOOLEAN DEFAULT false,
  context_window_tokens INTEGER,
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER,
  top_p NUMERIC,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  last_health_check TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown',
  total_requests INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: location_type
CREATE TABLE IF NOT EXISTS public.location_type (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: organisation
CREATE TABLE IF NOT EXISTS public.organisation (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL,
  organisation_name TEXT NOT NULL,
  organisation_type_id UUID,
  industry_id UUID,
  organisation_size INTEGER,
  website TEXT,
  logo_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: organisation_type
CREATE TABLE IF NOT EXISTS public.organisation_type (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: prompt_executions
CREATE TABLE IF NOT EXISTS public.prompt_executions (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  prompt_template_id UUID,
  llm_interface_id UUID,
  stakeholder_id UUID,
  input_data JSONB NOT NULL,
  rendered_prompt TEXT,
  model_used TEXT,
  temperature NUMERIC,
  max_tokens INTEGER,
  output_data JSONB,
  raw_response TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_estimate NUMERIC,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: prompt_templates
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  prompt_code TEXT NOT NULL,
  prompt_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,
  default_llm_interface_id UUID,
  default_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  output_format TEXT DEFAULT 'json',
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: relationship
CREATE TABLE IF NOT EXISTS public.relationship (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT (('REL-' || to_char(now(), 'YYYYMMDD')) || '-' || substr(gen_random_uuid()::text, 1, 8)),
  stakeholder_a_id UUID NOT NULL,
  stakeholder_b_id UUID NOT NULL,
  relationship_type TEXT NOT NULL,
  role_a_id UUID,
  role_b_id UUID,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  strength INTEGER,
  start_date DATE,
  end_date DATE,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: role
CREATE TABLE IF NOT EXISTS public.role (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  app_uuid UUID NOT NULL,
  stakeholder_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: sic_code
CREATE TABLE IF NOT EXISTS public.sic_code (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  section TEXT,
  division TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: stakeholder
CREATE TABLE IF NOT EXISTS public.stakeholder (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT (('STK-' || to_char(now(), 'YYYYMMDD')) || '-' || substr(gen_random_uuid()::text, 1, 8)),
  stakeholder_type TEXT NOT NULL,
  stakeholder_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  country_code TEXT,
  discovery_metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  additional_data JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: t_stakeholder
CREATE TABLE IF NOT EXISTS public.t_stakeholder (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT (('STK-' || to_char(now(), 'YYYYMMDD')) || '-' || substr(gen_random_uuid()::text, 1, 8)),
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  country_code TEXT,
  company_number TEXT,
  website TEXT,
  linkedin_url TEXT,
  additional_data JSONB DEFAULT '{}',
  source_holding_table_id UUID,
  current_state TEXT DEFAULT 'raw',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  email_address TEXT,
  enrichment_status TEXT DEFAULT 'pending',
  enrichment_data JSONB DEFAULT '{}',
  enrichment_started_at TIMESTAMPTZ,
  enrichment_completed_at TIMESTAMPTZ,
  enrichment_error TEXT,
  enrichment_pathway_id UUID
);

-- Table: users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PRIMARY KEYS
-- ============================================

ALTER TABLE public.address ADD CONSTRAINT address_pkey PRIMARY KEY (id);
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.contact_info ADD CONSTRAINT contact_info_pkey PRIMARY KEY (id);
ALTER TABLE public.enrichment_pathways ADD CONSTRAINT enrichment_pathways_pkey PRIMARY KEY (id);
ALTER TABLE public.holding_table_templates ADD CONSTRAINT holding_table_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.holding_tables ADD CONSTRAINT holding_tables_pkey PRIMARY KEY (id);
ALTER TABLE public.individual ADD CONSTRAINT individual_pkey PRIMARY KEY (id);
ALTER TABLE public.industry ADD CONSTRAINT industry_pkey PRIMARY KEY (id);
ALTER TABLE public.llm_interfaces ADD CONSTRAINT llm_interfaces_pkey PRIMARY KEY (id);
ALTER TABLE public.location_type ADD CONSTRAINT location_type_pkey PRIMARY KEY (id);
ALTER TABLE public.organisation ADD CONSTRAINT organisation_pkey PRIMARY KEY (id);
ALTER TABLE public.organisation_type ADD CONSTRAINT organisation_type_pkey PRIMARY KEY (id);
ALTER TABLE public.prompt_executions ADD CONSTRAINT prompt_executions_pkey PRIMARY KEY (id);
ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.relationship ADD CONSTRAINT relationship_pkey PRIMARY KEY (id);
ALTER TABLE public.role ADD CONSTRAINT role_pkey PRIMARY KEY (id);
ALTER TABLE public.sic_code ADD CONSTRAINT sic_code_pkey PRIMARY KEY (id);
ALTER TABLE public.stakeholder ADD CONSTRAINT stakeholder_pkey PRIMARY KEY (id);
ALTER TABLE public.t_stakeholder ADD CONSTRAINT t_stakeholder_pkey PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- ============================================
-- FOREIGN KEYS
-- ============================================

ALTER TABLE public.address ADD CONSTRAINT address_location_type_id_fkey FOREIGN KEY (location_type_id) REFERENCES public.location_type (id);
ALTER TABLE public.address ADD CONSTRAINT address_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholder (id) ON DELETE CASCADE;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id);
ALTER TABLE public.contact_info ADD CONSTRAINT contact_info_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholder (id) ON DELETE CASCADE;
ALTER TABLE public.holding_table_templates ADD CONSTRAINT holding_table_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users (id);
ALTER TABLE public.holding_tables ADD CONSTRAINT holding_tables_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.holding_table_templates (id);
ALTER TABLE public.holding_tables ADD CONSTRAINT holding_tables_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users (id);
ALTER TABLE public.individual ADD CONSTRAINT individual_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholder (id) ON DELETE CASCADE;
ALTER TABLE public.organisation ADD CONSTRAINT organisation_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industry (id);
ALTER TABLE public.organisation ADD CONSTRAINT organisation_organisation_type_id_fkey FOREIGN KEY (organisation_type_id) REFERENCES public.organisation_type (id);
ALTER TABLE public.organisation ADD CONSTRAINT organisation_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholder (id) ON DELETE CASCADE;
ALTER TABLE public.prompt_executions ADD CONSTRAINT prompt_executions_llm_interface_id_fkey FOREIGN KEY (llm_interface_id) REFERENCES public.llm_interfaces (id) ON DELETE SET NULL;
ALTER TABLE public.prompt_executions ADD CONSTRAINT prompt_executions_prompt_template_id_fkey FOREIGN KEY (prompt_template_id) REFERENCES public.prompt_templates (id) ON DELETE SET NULL;
ALTER TABLE public.prompt_executions ADD CONSTRAINT prompt_executions_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.t_stakeholder (id) ON DELETE CASCADE;
ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE SET NULL;
ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_default_llm_interface_id_fkey FOREIGN KEY (default_llm_interface_id) REFERENCES public.llm_interfaces (id) ON DELETE SET NULL;
ALTER TABLE public.relationship ADD CONSTRAINT relationship_role_a_id_fkey FOREIGN KEY (role_a_id) REFERENCES public.role (id);
ALTER TABLE public.relationship ADD CONSTRAINT relationship_role_b_id_fkey FOREIGN KEY (role_b_id) REFERENCES public.role (id);
ALTER TABLE public.relationship ADD CONSTRAINT relationship_stakeholder_a_id_fkey FOREIGN KEY (stakeholder_a_id) REFERENCES public.stakeholder (id) ON DELETE CASCADE;
ALTER TABLE public.relationship ADD CONSTRAINT relationship_stakeholder_b_id_fkey FOREIGN KEY (stakeholder_b_id) REFERENCES public.stakeholder (id) ON DELETE CASCADE;
ALTER TABLE public.t_stakeholder ADD CONSTRAINT fk_source_holding_table FOREIGN KEY (source_holding_table_id) REFERENCES public.holding_tables (id);
ALTER TABLE public.t_stakeholder ADD CONSTRAINT t_stakeholder_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users (id);
ALTER TABLE public.t_stakeholder ADD CONSTRAINT t_stakeholder_enrichment_pathway_id_fkey FOREIGN KEY (enrichment_pathway_id) REFERENCES public.enrichment_pathways (id);

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

ALTER TABLE public.enrichment_pathways ADD CONSTRAINT enrichment_pathways_code_key UNIQUE (code);
ALTER TABLE public.holding_table_templates ADD CONSTRAINT holding_table_templates_reference_key UNIQUE (reference);
ALTER TABLE public.holding_table_templates ADD CONSTRAINT holding_table_templates_template_code_key UNIQUE (template_code);
ALTER TABLE public.holding_tables ADD CONSTRAINT holding_tables_reference_key UNIQUE (reference);
ALTER TABLE public.individual ADD CONSTRAINT individual_stakeholder_id_key UNIQUE (stakeholder_id);
ALTER TABLE public.industry ADD CONSTRAINT industry_code_key UNIQUE (code);
ALTER TABLE public.llm_interfaces ADD CONSTRAINT llm_interfaces_code_key UNIQUE (code);
ALTER TABLE public.location_type ADD CONSTRAINT location_type_name_key UNIQUE (name);
ALTER TABLE public.organisation ADD CONSTRAINT organisation_stakeholder_id_key UNIQUE (stakeholder_id);
ALTER TABLE public.organisation_type ADD CONSTRAINT organisation_type_name_key UNIQUE (name);
ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_prompt_code_key UNIQUE (prompt_code);
ALTER TABLE public.relationship ADD CONSTRAINT relationship_reference_key UNIQUE (reference);
ALTER TABLE public.role ADD CONSTRAINT role_app_uuid_stakeholder_type_name_key UNIQUE (app_uuid, stakeholder_type, name);
ALTER TABLE public.sic_code ADD CONSTRAINT sic_code_code_key UNIQUE (code);
ALTER TABLE public.stakeholder ADD CONSTRAINT stakeholder_reference_key UNIQUE (reference);
ALTER TABLE public.t_stakeholder ADD CONSTRAINT t_stakeholder_reference_key UNIQUE (reference);
ALTER TABLE public.users ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- ============================================
-- CHECK CONSTRAINTS
-- ============================================

ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'failed'::text])));
ALTER TABLE public.contact_info ADD CONSTRAINT contact_info_contact_type_check CHECK ((contact_type = ANY (ARRAY['email'::text, 'phone'::text, 'social'::text, 'website'::text, 'other'::text])));
ALTER TABLE public.holding_tables ADD CONSTRAINT holding_tables_status_check CHECK ((status = ANY (ARRAY['active'::text, 'processing'::text, 'completed'::text, 'archived'::text])));
ALTER TABLE public.individual ADD CONSTRAINT individual_sex_assigned_at_birth_check CHECK ((sex_assigned_at_birth = ANY (ARRAY['male'::text, 'female'::text, 'intersex'::text, 'other'::text, 'prefer_not_to_say'::text])));
ALTER TABLE public.llm_interfaces ADD CONSTRAINT llm_interfaces_health_status_check CHECK ((health_status = ANY (ARRAY['healthy'::text, 'degraded'::text, 'unhealthy'::text, 'unknown'::text])));
ALTER TABLE public.llm_interfaces ADD CONSTRAINT llm_interfaces_provider_check CHECK ((provider = ANY (ARRAY['anthropic'::text, 'openai'::text, 'deepseek'::text, 'gemini'::text])));
ALTER TABLE public.prompt_executions ADD CONSTRAINT prompt_executions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text])));
ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_category_check CHECK ((category = ANY (ARRAY['ENRICHMENT'::text, 'ANALYSIS'::text, 'DOCUMENT'::text, 'CUSTOM'::text])));
ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_max_tokens_check CHECK ((max_tokens > 0));
ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_output_format_check CHECK ((output_format = ANY (ARRAY['json'::text, 'markdown'::text, 'text'::text])));
ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_temperature_check CHECK (((temperature >= (0)::numeric) AND (temperature <= (1)::numeric)));
ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_version_check CHECK ((version > 0));
ALTER TABLE public.relationship ADD CONSTRAINT relationship_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text, 'historical'::text])));
ALTER TABLE public.relationship ADD CONSTRAINT relationship_strength_check CHECK (((strength >= 1) AND (strength <= 10)));
ALTER TABLE public.role ADD CONSTRAINT role_stakeholder_type_check CHECK ((stakeholder_type = ANY (ARRAY['organisation'::text, 'individual'::text])));
ALTER TABLE public.stakeholder ADD CONSTRAINT stakeholder_stakeholder_type_check CHECK ((stakeholder_type = ANY (ARRAY['organisation'::text, 'individual'::text, 'admin'::text])));
ALTER TABLE public.stakeholder ADD CONSTRAINT stakeholder_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text])));
ALTER TABLE public.t_stakeholder ADD CONSTRAINT t_stakeholder_enrichment_status_check CHECK ((enrichment_status = ANY (ARRAY['pending'::text, 'enriching'::text, 'review'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE public.t_stakeholder ADD CONSTRAINT t_stakeholder_entity_type_check CHECK ((entity_type = ANY (ARRAY['individual'::text, 'organisation'::text])));
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'viewer'::text])));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_address_country ON public.address (country_code);
CREATE INDEX IF NOT EXISTS idx_address_primary ON public.address (is_primary);
CREATE INDEX IF NOT EXISTS idx_address_stakeholder ON public.address (stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_address_what3words ON public.address (what3words);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_contact_info_primary ON public.contact_info (is_primary);
CREATE INDEX IF NOT EXISTS idx_contact_info_stakeholder ON public.contact_info (stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_contact_info_type ON public.contact_info (contact_type);
CREATE INDEX IF NOT EXISTS idx_holding_tables_status ON public.holding_tables (status);
CREATE INDEX IF NOT EXISTS idx_holding_tables_template ON public.holding_tables (template_id);
CREATE INDEX IF NOT EXISTS idx_individual_stakeholder ON public.individual (stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_industry_active ON public.industry (is_active);
CREATE INDEX IF NOT EXISTS idx_industry_code ON public.industry (code);
CREATE INDEX IF NOT EXISTS idx_industry_section ON public.industry (section);
CREATE INDEX IF NOT EXISTS idx_llm_interfaces_code ON public.llm_interfaces (code);
CREATE INDEX IF NOT EXISTS idx_llm_interfaces_is_active ON public.llm_interfaces (is_active);
CREATE INDEX IF NOT EXISTS idx_llm_interfaces_is_default ON public.llm_interfaces (is_default);
CREATE INDEX IF NOT EXISTS idx_llm_interfaces_provider ON public.llm_interfaces (provider);
CREATE INDEX IF NOT EXISTS idx_location_type_active ON public.location_type (is_active);
CREATE INDEX IF NOT EXISTS idx_organisation_industry ON public.organisation (industry_id);
CREATE INDEX IF NOT EXISTS idx_organisation_stakeholder ON public.organisation (stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_organisation_type ON public.organisation (organisation_type_id);
CREATE INDEX IF NOT EXISTS idx_organisation_type_active ON public.organisation_type (is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_created ON public.prompt_executions (created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_llm_interface ON public.prompt_executions (llm_interface_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_stakeholder ON public.prompt_executions (stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_status ON public.prompt_executions (status);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_template ON public.prompt_executions (prompt_template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON public.prompt_templates (is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON public.prompt_templates (category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_code ON public.prompt_templates (prompt_code);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_llm_interface ON public.prompt_templates (default_llm_interface_id);
CREATE INDEX IF NOT EXISTS idx_relationship_stakeholder_a ON public.relationship (stakeholder_a_id);
CREATE INDEX IF NOT EXISTS idx_relationship_stakeholder_b ON public.relationship (stakeholder_b_id);
CREATE INDEX IF NOT EXISTS idx_relationship_status ON public.relationship (status);
CREATE INDEX IF NOT EXISTS idx_relationship_type ON public.relationship (relationship_type);
CREATE INDEX IF NOT EXISTS idx_role_active ON public.role (is_active);
CREATE INDEX IF NOT EXISTS idx_role_app ON public.role (app_uuid);
CREATE INDEX IF NOT EXISTS idx_role_type ON public.role (stakeholder_type);
CREATE INDEX IF NOT EXISTS idx_sic_code_code ON public.sic_code (code);
CREATE INDEX IF NOT EXISTS idx_sic_code_section ON public.sic_code (section);
CREATE INDEX IF NOT EXISTS idx_stakeholder_country ON public.stakeholder (country_code);
CREATE INDEX IF NOT EXISTS idx_stakeholder_discovery ON public.stakeholder (discovery_metadata);
CREATE INDEX IF NOT EXISTS idx_stakeholder_status ON public.stakeholder (status);
CREATE INDEX IF NOT EXISTS idx_stakeholder_tags ON public.stakeholder (tags);
CREATE INDEX IF NOT EXISTS idx_stakeholder_type ON public.stakeholder (stakeholder_type);
CREATE INDEX IF NOT EXISTS idx_t_stakeholder_additional_data ON public.t_stakeholder (additional_data);
CREATE INDEX IF NOT EXISTS idx_t_stakeholder_country ON public.t_stakeholder (country_code);
CREATE INDEX IF NOT EXISTS idx_t_stakeholder_enrichment_data ON public.t_stakeholder (enrichment_data);
CREATE INDEX IF NOT EXISTS idx_t_stakeholder_enrichment_status ON public.t_stakeholder (enrichment_status);
CREATE INDEX IF NOT EXISTS idx_t_stakeholder_entity_type ON public.t_stakeholder (entity_type);
CREATE INDEX IF NOT EXISTS idx_t_stakeholder_state ON public.t_stakeholder (current_state);

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW public.relationship_with_roles AS
SELECT 
    r.id,
    r.reference,
    r.stakeholder_a_id,
    s_a.stakeholder_name AS stakeholder_a_name,
    r.role_a_id,
    role_a.name AS role_a_name,
    r.relationship_type,
    r.stakeholder_b_id,
    s_b.stakeholder_name AS stakeholder_b_name,
    r.role_b_id,
    role_b.name AS role_b_name,
    r.status,
    r.strength,
    r.start_date,
    r.end_date
FROM relationship r
JOIN stakeholder s_a ON r.stakeholder_a_id = s_a.id
JOIN stakeholder s_b ON r.stakeholder_b_id = s_b.id
LEFT JOIN role role_a ON r.role_a_id = role_a.id
LEFT JOIN role role_b ON r.role_b_id = role_b.id;

CREATE OR REPLACE VIEW public.stakeholder_full AS
SELECT 
    s.id,
    s.reference,
    s.stakeholder_type,
    s.stakeholder_name,
    s.status,
    s.country_code,
    s.created_at,
    s.updated_at,
    COALESCE(o.organisation_name, s.stakeholder_name) AS display_name,
    o.organisation_type_id,
    ot.name AS organisation_type_name,
    o.industry_id,
    ind.name AS industry_name,
    o.organisation_size,
    o.website,
    ind_r.name AS individual_name,
    ind_r.date_of_birth,
    ind_r.gender_identity,
    ind_r.pronoun
FROM stakeholder s
LEFT JOIN organisation o ON s.id = o.stakeholder_id
LEFT JOIN organisation_type ot ON o.organisation_type_id = ot.id
LEFT JOIN industry ind ON o.industry_id = ind.id
LEFT JOIN individual ind_r ON s.id = ind_r.stakeholder_id;

-- ============================================
-- ROW LEVEL SECURITY (RLS) STATUS
-- ============================================
-- 
-- Tables with RLS ENABLED:
-- - audit_log
-- - holding_table_templates
-- - holding_tables
-- - llm_interfaces
-- - prompt_executions
-- - prompt_templates
-- - t_stakeholder
-- - users
--
-- Tables with RLS DISABLED:
-- - address
-- - contact_info
-- - enrichment_pathways
-- - individual
-- - industry
-- - location_type
-- - organisation
-- - organisation_type
-- - relationship
-- - role
-- - sic_code
-- - stakeholder
--
-- Note: RLS policies are not included in this dump.
-- Use Supabase dashboard or pg_policies view to see actual policies.
-- ============================================















