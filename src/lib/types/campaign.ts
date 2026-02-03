// ============================================================================
// BuildBid: Campaign TypeScript Types
// Type definitions for campaigns, campaign types, and related entities
// ============================================================================

export interface FunnelStage {
  name: string;
  order: number;
  is_success?: boolean; // true = Closed Won, false = Closed Lost, undefined = in-progress
}

export interface FunnelStages {
  stages: FunnelStage[];
}

export interface CampaignType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  funnel_stages: FunnelStages | null;
  auto_advance_enabled: boolean;
  auto_advance_days: number | null;
  metadata: Record<string, any>;
  created_at: string;
  // Extended fields (from migration)
  app_uuid?: string;
  role_uuid?: string | null;
  is_role_specific?: boolean;
  is_active?: boolean;
  cloned_from_id?: string | null;
  owner_id?: string | null;
  updated_at?: string;
  updated_by?: string | null;
}

export interface CampaignFormData {
  name: string;
  campaign_type_id: string;
  description?: string;
  owner_id: string;
  team_members?: string[]; // Array of stakeholder UUIDs
  launch_date?: string; // ISO date
  end_date?: string; // ISO date
  target_count?: number;
}

export interface Campaign {
  id: string;
  reference: string; // Auto-generated: CAMP-YYYYMMDD-xxxxxxxx
  campaign_type_id: string;
  name: string;
  description: string | null;
  owner_id: string;
  team_members: string[]; // UUID array
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  launch_date: string | null;
  end_date: string | null;
  target_count: number | null;
  actual_count: number;
  success_rate: number;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  app_uuid: string;
  // Related data (from joins)
  campaign_type?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  };
  owner?: {
    id: string;
    name: string;
    email: string | null;
    reference: string;
  };
}

export interface CampaignPerformance {
  id: string;
  reference: string;
  name: string;
  status: string;
  total_opportunities: number;
  converted_count: number;
  conversion_rate: number; // Percentage
  total_interactions: number;
}

export interface Stakeholder {
  id: string;
  name: string;
  email: string;
}


