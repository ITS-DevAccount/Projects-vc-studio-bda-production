export type StakeholderStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface StakeholderSummary {
  id: string;
  reference: string;
  name: string;
  stakeholder_type_id: string;
  email: string | null;
  status: StakeholderStatus;
  is_verified: boolean;
  created_at: string;
}

export interface StakeholderCreateInput {
  name: string;
  stakeholder_type_id: string;
  email?: string;
  phone?: string;
  website?: string;
  status?: StakeholderStatus;
}

export interface StakeholderUpdateInput {
  name?: string;
  stakeholder_type_id?: string;
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


