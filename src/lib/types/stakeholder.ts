export type StakeholderStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface StakeholderSummary {
  id: string;
  reference: string;
  name: string;
  stakeholder_type_id: string;
  primary_role_id?: string | null;
  email: string | null;
  status: StakeholderStatus;
  is_verified: boolean;
  is_user?: boolean;
  invite_email?: string | null;
  created_at: string;
}

export interface StakeholderCreateInput {
  name: string;
  stakeholder_type_id: string;
  primary_role_id?: string | null;
  is_user?: boolean;
  invite_uuid?: string | null;
  invite_email?: string | null;
  email?: string;
  phone?: string;
  website?: string;
  status?: StakeholderStatus;
}

export interface StakeholderUpdateInput {
  name?: string;
  stakeholder_type_id?: string;
  primary_role_id?: string | null;
  is_user?: boolean;
  invite_uuid?: string | null;
  invite_email?: string | null;
  email?: string;
  phone?: string;
  website?: string;
  status?: StakeholderStatus;
  is_verified?: boolean;
}

export interface RoleAssignment {
  stakeholder_id: string;
  role_type: string;
}





