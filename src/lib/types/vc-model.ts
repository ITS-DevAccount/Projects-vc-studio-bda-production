// TypeScript type definitions for VC Model and FLM functionality
// Aligned with FLM data model tables

export type VCModelStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
export type FLMStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
export type FLMStep = 'BVS' | 'PRELIMINARY_DBS' | 'DBS_REVIEW' | 'DBS_COMPLETE' | 'L0' | 'L1' | 'L2' | 'BLUEPRINT';
export type FLMArtefactStatus = 'DRAFT' | 'PENDING_REVIEW' | 'CONFIRMED' | 'SUPERSEDED';
export type FLMArtefactType = 'BVS' | 'PRELIMINARY_DBS' | 'DBS_REVIEW' | 'DBS_COMPLETE' | 'L0' | 'L1' | 'L2' | 'BLUEPRINT';

export interface VCModel {
  id: string;
  model_code: string;
  model_name: string;
  description?: string | null;
  status: VCModelStatus;
  version_number: number;
  is_current_version: boolean;
  parent_version_id?: string | null;
  stakeholder_id: string;
  app_uuid: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FLMModel {
  id: string;
  vc_model_id: string;
  status: FLMStatus;
  current_step?: FLMStep | null;
  flm_version: number;
  description?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FLMArtefact {
  id: string;
  flm_model_id: string;
  artefact_type: FLMArtefactType;
  artefact_json: unknown;
  status: FLMArtefactStatus;
  version: number;
  document_path?: string | null;
  created_by: string | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
