export type OnboardingStep =
  | 'type-selection'
  | 'registration'
  | 'roles'
  | 'relationships'
  | 'verification';

export type StakeholderTypeCode =
  | 'individual'
  | 'organisation'
  | 'collective'
  | 'company'
  | 'cooperative'
  | 'ngo'
  | 'government'
  | 'association';

export type RoleCode =
  | 'individual'
  | 'investor'
  | 'producer'
  | 'administrator';

export interface OnboardingFormData {
  // Step 1: Type Selection
  stakeholder_type: StakeholderTypeCode | null;

  // Step 2: Registration (common fields)
  name: string;
  email: string;
  phone: string;
  website?: string;

  // Individual-specific fields
  bio?: string;
  professional_background?: string;

  // Organisation-specific fields
  registration_number?: string;
  industry?: string;
  size?: string;
  lead_contact?: string;

  // Location fields
  country?: string;
  region?: string;
  city?: string;

  // Step 3: Roles
  selected_roles: RoleCode[];
  primary_role: RoleCode | null;

  // Role-specific data
  role_details?: {
    investor?: {
      investment_company?: string;
      min_investment?: number;
      focus_sectors?: string[];
      geographic_focus?: string[];
    };
    producer?: {
      certifications?: string[];
      production_focus?: string[];
      years_experience?: number;
    };
    administrator?: {
      organization_represented?: string;
      management_authority?: string;
    };
  };

  // Step 4: Relationships
  relationships: RelationshipInput[];

  // Step 5: Verification
  terms_accepted: boolean;
  marketing_consent: boolean;
}

export interface RelationshipInput {
  to_stakeholder_id: string;
  relationship_type_code: string;
  strength?: number;
  description?: string;
}

export interface StakeholderType {
  id: string;
  code: StakeholderTypeCode;
  label: string;
  description: string;
  is_active: boolean;
}

export interface Role {
  id: string;
  code: RoleCode;
  label: string;
  description: string;
  is_active: boolean;
}

export interface RelationshipType {
  id: string;
  code: string;
  label: string;
  description: string;
  is_bidirectional: boolean;
  reverse_label?: string;
  is_active: boolean;
}

export interface OnboardingSubmission {
  stakeholder: {
    name: string;
    stakeholder_type_id: string;
    primary_role_id: string;
    email: string;
    phone?: string;
    website?: string;
    country?: string;
    region?: string;
    city?: string;
    industry?: string;
    sector?: string;
    status: 'pending';
    is_verified: false;
    metadata?: Record<string, any>;
  };
  role_codes: string[];
  relationships?: Array<{
    to_stakeholder_id: string;
    relationship_type_id: string;
    strength?: number;
    metadata?: Record<string, any>;
  }>;
  invite_email: string;
}

export interface OnboardingResponse {
  success: boolean;
  stakeholder_id?: string;
  is_new?: boolean;
  message?: string;
  error?: string;
}
