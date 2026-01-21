-- Sprint 1d.7: FLM Building Workflow - Seed Core FLM Prompts
-- Phase C: FLM Assembly
-- Uses ON CONFLICT (app_id, prompt_code) to update existing prompts or insert new ones

DO $$
DECLARE
  v_app_id UUID;
BEGIN
  -- Get app ID
  SELECT id INTO v_app_id FROM applications WHERE app_code = 'VC_STUDIO';
  
  IF v_app_id IS NULL THEN
    RAISE EXCEPTION 'VC_STUDIO application not found';
  END IF;

  -- Prompt 1: BVS_TO_DBS
  INSERT INTO prompt_templates (
    app_id,
    prompt_code,
    prompt_name,
    description,
    category,
    system_prompt,
    user_prompt_template,
    default_model,
    temperature,
    max_tokens,
    input_schema,
    output_schema,
    output_format,
    is_active
  ) VALUES (
    v_app_id,
    'BVS_TO_DBS',
    'Business Value Summary to Domain Business Summary',
    'Analyzes natural language business descriptions and creates structured data requirements',
    'FLM',
    'You are a business analyst expert in the Value Chain Evolution Framework (VCEF). Your role is to analyze natural language business descriptions and create structured data requirements for comprehensive business documentation. You must output valid JSON only.',
    'Analyze the following Business Value Summary (BVS) and create a Domain Business Summary (DBS) schema.

BVS:
{{bvs}}

Create a JSON response with two parts:
1. ''schema'': A JSON Schema defining the structured business data fields needed to fully document this business
2. ''prefill'': Pre-populated values you can infer from the BVS

The schema should capture:
- Business identity (name, legal structure, location)
- Product/service details
- Target market and customer segments
- Supply chain / sourcing
- Revenue model
- Key differentiators
- Growth intentions

Output format:
```json
{
  "schema": {
    "type": "object",
    "properties": {
      "business_name": { "type": "string", "title": "Business Name" },
      "legal_structure": { "type": "string", "enum": ["Sole Trader", "Partnership", "Limited Company", "Other"] },
      "location": { "type": "string", "title": "Primary Location" }
    },
    "required": ["business_name"]
  },
  "prefill": {
    "business_name": "..."
  }
}
```',
    'claude-sonnet-4-5-20250929',
    0.7,
    4096,
    '{"type": "object", "properties": {"bvs": {"type": "string"}}, "required": ["bvs"]}'::jsonb,
    '{"type": "object", "properties": {"schema": {"type": "object"}, "prefill": {"type": "object"}}, "required": ["schema", "prefill"]}'::jsonb,
    'json',
    true
  ) ON CONFLICT (app_id, prompt_code) DO UPDATE SET
    prompt_name = EXCLUDED.prompt_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    system_prompt = EXCLUDED.system_prompt,
    user_prompt_template = EXCLUDED.user_prompt_template,
    default_model = EXCLUDED.default_model,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    input_schema = EXCLUDED.input_schema,
    output_schema = EXCLUDED.output_schema,
    output_format = EXCLUDED.output_format,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  -- Prompt 2: DBS_TO_L0
  INSERT INTO prompt_templates (
    app_id,
    prompt_code,
    prompt_name,
    description,
    category,
    system_prompt,
    user_prompt_template,
    default_model,
    temperature,
    max_tokens,
    output_format,
    is_active
  ) VALUES (
    v_app_id,
    'DBS_TO_L0',
    'Domain Business Summary to L0 Domain Study',
    'Creates comprehensive L0 Domain Study from business information',
    'FLM',
    'You are a strategic business analyst creating L0 Domain Studies for the Value Chain Evolution Framework (VCEF). L0 represents the broadest context in which a business operates. You must output comprehensive, structured JSON.',
    'Create an L0 Domain Study based on the following business information.

Business Value Summary:
{{bvs}}

Domain Business Summary:
{{dbs}}

Generate a comprehensive L0 Domain Study covering:

1. **Market Context**
   - Total Addressable Market (TAM)
   - Serviceable Addressable Market (SAM)
   - Serviceable Obtainable Market (SOM)
   - Market trends and growth drivers
   - Market maturity stage

2. **Competitive Landscape**
   - Key competitors (direct and indirect)
   - Competitive positioning
   - Barriers to entry
   - Differentiation opportunities

3. **Regulatory Environment**
   - Relevant regulations and compliance requirements
   - Certifications required
   - Jurisdictional considerations

4. **Customer Analysis**
   - Primary customer segments
   - Customer personas
   - Pain points and needs
   - Buying behavior

5. **Stakeholder Ecosystem**
   - Key supplier relationships
   - Distribution channels
   - Strategic partners
   - Industry associations

6. **Value Proposition**
   - Core offering definition
   - Unique selling points
   - Value delivery mechanism

7. **Risk Factors**
   - Market risks
   - Operational risks
   - Competitive risks

Output as structured JSON with clear sections.',
    'claude-sonnet-4-5-20250929',
    0.7,
    8192,
    'json',
    true
  ) ON CONFLICT (app_id, prompt_code) DO UPDATE SET
    prompt_name = EXCLUDED.prompt_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    system_prompt = EXCLUDED.system_prompt,
    user_prompt_template = EXCLUDED.user_prompt_template,
    default_model = EXCLUDED.default_model,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    output_format = EXCLUDED.output_format,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  -- Prompt 3: L0_TO_L1
  INSERT INTO prompt_templates (
    app_id,
    prompt_code,
    prompt_name,
    description,
    category,
    system_prompt,
    user_prompt_template,
    default_model,
    temperature,
    max_tokens,
    output_format,
    is_active
  ) VALUES (
    v_app_id,
    'L0_TO_L1',
    'L0 Domain Study to L1 Business Pillars',
    'Creates L1 Sub-Domain definitions from L0 context and defined pillars',
    'FLM',
    'You are creating L1 Sub-Domain definitions for VCEF. L1 represents the major business segments aligned with strategic objectives. Each pillar should represent a distinct value creation area that can be decomposed into capabilities (L2).',
    'Create L1 Business Pillar definitions based on the following:

L0 Domain Study:
{{l0}}

Defined Pillars:
{{pillars}}

Unit Economics:
{{unitEconomics}}

For each pillar, create a comprehensive definition including:

1. **Pillar Identity**
   - Code (e.g., ''SOURCING'', ''PRODUCTION'', ''SALES'')
   - Name
   - Description
   - Strategic objective

2. **Value Contribution**
   - How this pillar contributes to overall value chain
   - Revenue attribution (if applicable)
   - Cost attribution
   - Key metrics

3. **Operational Scope**
   - Primary activities
   - Key processes
   - Resource requirements
   - Technology needs

4. **Dependencies**
   - Upstream dependencies (inputs from other pillars)
   - Downstream dependencies (outputs to other pillars)
   - External dependencies

5. **Success Factors**
   - Critical success factors
   - Key performance indicators
   - Risk factors

Output as structured JSON array of pillar definitions.',
    'claude-sonnet-4-5-20250929',
    0.7,
    8192,
    'json',
    true
  ) ON CONFLICT (app_id, prompt_code) DO UPDATE SET
    prompt_name = EXCLUDED.prompt_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    system_prompt = EXCLUDED.system_prompt,
    user_prompt_template = EXCLUDED.user_prompt_template,
    default_model = EXCLUDED.default_model,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    output_format = EXCLUDED.output_format,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  -- Prompt 4: L1_TO_L2
  INSERT INTO prompt_templates (
    app_id,
    prompt_code,
    prompt_name,
    description,
    category,
    system_prompt,
    user_prompt_template,
    default_model,
    temperature,
    max_tokens,
    output_format,
    is_active
  ) VALUES (
    v_app_id,
    'L1_TO_L2',
    'L1 Business Pillars to L2 Capabilities Matrix',
    'Creates L2 Component/Capability definitions from complete FLM context',
    'FLM',
    'You are creating L2 Component/Capability definitions for VCEF. L2 represents the functional capabilities required to deliver each L1 sub-domain. These capabilities form the strategic foundation applicable across all businesses.',
    'Create an L2 Capabilities Matrix based on the complete FLM context:

Business Value Summary:
{{bvs}}

Domain Business Summary:
{{dbs}}

L0 Domain Study:
{{l0}}

L1 Business Pillars:
{{l1}}

For each L1 pillar, define the L2 capabilities required. Use these standard capability categories as a framework:

**Standard Capability Categories:**
1. Core Operations (what delivers the product/service)
2. Customer Acquisition & Retention
3. Supply Chain / Sourcing
4. Financial Management
5. Technology & Systems
6. People & Organization
7. Compliance & Governance

For each capability, define:

1. **Capability Identity**
   - Code
   - Name
   - Parent pillar (L1 reference)
   - Description

2. **Functional Requirements**
   - What this capability must accomplish
   - Inputs required
   - Outputs produced

3. **Maturity Assessment**
   - Current state (if known)
   - Target state
   - Gap analysis

4. **Resource Requirements**
   - Human resources
   - Technology requirements
   - Financial requirements

5. **AI Opportunity**
   - Potential for AI enhancement
   - Suggested AI applications
   - Human-AI collaboration model

Output as structured JSON with capabilities grouped by L1 pillar.',
    'claude-sonnet-4-5-20250929',
    0.7,
    12000,
    'json',
    true
  ) ON CONFLICT (app_id, prompt_code) DO UPDATE SET
    prompt_name = EXCLUDED.prompt_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    system_prompt = EXCLUDED.system_prompt,
    user_prompt_template = EXCLUDED.user_prompt_template,
    default_model = EXCLUDED.default_model,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    output_format = EXCLUDED.output_format,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  -- Prompt 5: FLM_TO_BLUEPRINT
  INSERT INTO prompt_templates (
    app_id,
    prompt_code,
    prompt_name,
    description,
    category,
    system_prompt,
    user_prompt_template,
    default_model,
    temperature,
    max_tokens,
    output_format,
    is_active
  ) VALUES (
    v_app_id,
    'FLM_TO_BLUEPRINT',
    'FLM to Business Blueprint',
    'Creates comprehensive Business Blueprint document from complete FLM',
    'DOCUMENT',
    'You are creating a comprehensive Business Blueprint document from a complete Framework Level Mapping (FLM). The Blueprint should be suitable for investors, partners, and internal stakeholders. Output in Markdown format.',
    'Create a Business Blueprint document from the following FLM:

{{flm}}

The Business Blueprint should include:

1. **Executive Summary** (1 page)
2. **Business Overview**
   - Vision and Mission
   - Value Proposition
   - Business Model
3. **Market Analysis** (from L0)
   - Market Opportunity
   - Competitive Landscape
   - Target Customers
4. **Strategic Framework** (from L1)
   - Business Pillars
   - Strategic Objectives
   - Value Chain Overview
5. **Operational Capabilities** (from L2)
   - Core Capabilities
   - Technology Strategy
   - Resource Requirements
6. **Financial Overview**
   - Revenue Model
   - Unit Economics
   - Investment Requirements
7. **Growth Strategy**
   - Milestones
   - Scaling Approach
8. **Risk Assessment**
9. **Investment Proposition** (if applicable)
   - Funding Requirements
   - Use of Funds
   - Investor Profile

Output as well-structured Markdown.',
    'claude-sonnet-4-5-20250929',
    0.7,
    16000,
    'markdown',
    true
  ) ON CONFLICT (app_id, prompt_code) DO UPDATE SET
    prompt_name = EXCLUDED.prompt_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    system_prompt = EXCLUDED.system_prompt,
    user_prompt_template = EXCLUDED.user_prompt_template,
    default_model = EXCLUDED.default_model,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    output_format = EXCLUDED.output_format,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  -- Prompt 6: FLM_TO_ONE_PAGER
  INSERT INTO prompt_templates (
    app_id,
    prompt_code,
    prompt_name,
    description,
    category,
    system_prompt,
    user_prompt_template,
    default_model,
    temperature,
    max_tokens,
    output_format,
    is_active
  ) VALUES (
    v_app_id,
    'FLM_TO_ONE_PAGER',
    'FLM to One-Page Visual Summary',
    'Creates compelling one-page visual summary for investor engagement',
    'DOCUMENT',
    'Create a compelling one-page visual summary suitable for initial investor or partner engagement. The output should be structured for easy conversion to a designed document.',
    'Create a One-Page Visual Summary from the following FLM:

{{flm}}

Structure the one-pager with these sections:

1. **Header**
   - Company name and tagline
   - Logo placeholder

2. **The Problem** (2-3 bullet points)

3. **The Solution** (2-3 bullet points)

4. **Market Opportunity**
   - TAM/SAM/SOM figures
   - Key statistic

5. **Business Model**
   - How you make money (simple diagram description)
   - Unit economics summary

6. **Traction / Milestones**
   - Key achievements or planned milestones

7. **Team** (placeholder section)

8. **The Ask**
   - Investment sought
   - Use of funds summary

9. **Contact**

Output as structured JSON for layout purposes.',
    'claude-sonnet-4-5-20250929',
    0.7,
    4096,
    'json',
    true
  ) ON CONFLICT (app_id, prompt_code) DO UPDATE SET
    prompt_name = EXCLUDED.prompt_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    system_prompt = EXCLUDED.system_prompt,
    user_prompt_template = EXCLUDED.user_prompt_template,
    default_model = EXCLUDED.default_model,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    output_format = EXCLUDED.output_format,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  -- Prompt 7: FLM_TO_PITCH_DECK
  INSERT INTO prompt_templates (
    app_id,
    prompt_code,
    prompt_name,
    description,
    category,
    system_prompt,
    user_prompt_template,
    default_model,
    temperature,
    max_tokens,
    output_format,
    is_active
  ) VALUES (
    v_app_id,
    'FLM_TO_PITCH_DECK',
    'FLM to Pitch Deck Structure',
    'Creates comprehensive pitch deck structure with slide-by-slide content',
    'DOCUMENT',
    'Create a comprehensive pitch deck structure with slide-by-slide content. The deck should be adaptable based on investor profile.',
    'Create a Pitch Deck from the following FLM:

{{flm}}

Investor Profile (if provided):
{{investorProfile}}

Create a 12-15 slide pitch deck with the following structure:

1. **Title Slide**
2. **Problem**
3. **Solution**
4. **Market Opportunity**
5. **Product/Service**
6. **Business Model**
7. **Traction**
8. **Competition**
9. **Go-to-Market Strategy**
10. **Team**
11. **Financials**
12. **Investment Ask**
13. **Use of Funds**
14. **Milestones / Roadmap**
15. **Contact / Q&A**

For each slide provide:
- Slide title
- Key message (one sentence)
- Bullet points (3-5)
- Suggested visual (chart type, diagram description)
- Speaker notes

Output as structured JSON array of slides.',
    'claude-sonnet-4-5-20250929',
    0.7,
    12000,
    'json',
    true
  ) ON CONFLICT (app_id, prompt_code) DO UPDATE SET
    prompt_name = EXCLUDED.prompt_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    system_prompt = EXCLUDED.system_prompt,
    user_prompt_template = EXCLUDED.user_prompt_template,
    default_model = EXCLUDED.default_model,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    output_format = EXCLUDED.output_format,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

END $$;
