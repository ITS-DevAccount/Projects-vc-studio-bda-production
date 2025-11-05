export type RelationshipStatus = 'active' | 'inactive' | 'pending' | 'terminated';

export interface RelationshipType {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_bidirectional: boolean;
  reverse_label: string | null;
}

export interface Relationship {
  id: string;
  reference: string;
  from_stakeholder_id: string;
  to_stakeholder_id: string;
  relationship_type_id: string;
  strength: number | null;
  duration_months: number | null;
  status: RelationshipStatus;
  start_date: string;
  end_date: string | null;
  last_interaction: string | null;
  interaction_count: number;
  value_context: Record<string, any>;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelationshipSummary {
  id: string;
  reference: string;
  from_stakeholder_id: string;
  to_stakeholder_id: string;
  relationship_type_id: string;
  status: RelationshipStatus;
  from_stakeholder_name?: string;
  to_stakeholder_name?: string;
  relationship_type_label?: string;
}

export interface RelationshipCreateInput {
  from_stakeholder_id: string;
  to_stakeholder_id: string;
  relationship_type_id: string;
  strength?: number;
  duration_months?: number;
  status?: RelationshipStatus;
  start_date?: string;
  end_date?: string;
  value_context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface RelationshipUpdateInput {
  relationship_type_id?: string;
  strength?: number;
  duration_months?: number;
  status?: RelationshipStatus;
  start_date?: string;
  end_date?: string;
  last_interaction?: string;
  interaction_count?: number;
  value_context?: Record<string, any>;
  metadata?: Record<string, any>;
}

