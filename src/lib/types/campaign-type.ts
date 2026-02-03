// ============================================================================
// BuildBid: Campaign Type TypeScript Types
// Type definitions for campaign types and related structures
// ============================================================================

export interface FunnelStage {
  id?: string; // Temporary ID for editing
  name: string;
  order: number;
  description?: string;
  expected_duration_days?: number;
  is_success: boolean | null; // true = Closed Won, false = Closed Lost, null = in-progress
  color?: string;
}

export interface FunnelStages {
  stages: FunnelStage[];
}

export interface CampaignTypeMetadata {
  automation?: {
    auto_advance_enabled: boolean;
    auto_advance_days: number;
    notify_before_advance: boolean;
    advance_to_stage: string;
  };
  notifications?: {
    on_new_opportunity: boolean;
    on_stage_change: boolean;
    on_closed_won: boolean;
    on_closed_lost: boolean;
    recipients: string[]; // Role codes
    email_template_id: string | null;
  };
  defaults?: {
    engagement_level: 'cold' | 'warm' | 'hot';
    initial_interaction: 'email' | 'call' | 'message' | 'meeting';
    target_response_hours: number;
    default_owner_role: string;
  };
  custom_fields?: CustomField[];
  integrations?: {
    webhook_url: string | null;
    crm_sync_url: string | null;
    sync_enabled: boolean;
    sync_fields: string[];
  };
  scoring?: {
    warm_multiplier: number;
    hot_multiplier: number;
    min_qualification_score: number;
    auto_qualify_enabled: boolean;
    factors: {
      contract_value_weight: number;
      response_speed_weight: number;
      engagement_weight: number;
    };
  };
  validation?: {
    require_notes_on_stage_change: boolean;
    require_interaction_before_advance: boolean;
    min_interactions_before_close: number;
  };
  ui?: {
    show_value_in_list: boolean;
    show_duration_in_list: boolean;
    default_sort: string;
    default_sort_order: 'asc' | 'desc';
  };
}

export interface CustomField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'select';
  required: boolean;
  default?: any;
  options?: string[]; // For 'select' type
}

export interface CampaignType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  
  // Multi-tenancy
  app_uuid: string;
  role_uuid: string | null;
  is_role_specific: boolean;
  
  // Configuration
  funnel_stages: FunnelStages;
  auto_advance_enabled: boolean;
  auto_advance_days: number | null;
  metadata: CampaignTypeMetadata;
  
  // Lifecycle
  is_active: boolean;
  cloned_from_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  
  // Relations (from joins)
  role?: {
    id: string;
    code: string;
    label: string;
    description: string | null;
  };
  owner?: {
    id: string;
    name: string;
    email: string | null;
  };
  campaigns_count?: number;
}

export interface CampaignTypeFormData {
  name: string;
  code: string;
  description: string;
  owner_id: string;
  is_role_specific: boolean;
  role_uuid: string | null;
}

export interface CloneSettings {
  funnel_stages: boolean;
  metadata: boolean;
  auto_advance: boolean;
}

export interface Role {
  id: string;
  code: string;
  label: string;
  description: string | null;
}

export interface Stakeholder {
  id: string;
  name: string;
  email: string | null;
}

