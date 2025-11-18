/**
 * Sprint 10.1d.2: Registry Consolidation & Management
 * TypeScript types for components_registry table and registry management
 */

export type RegistryType = 'UI_COMPONENT' | 'AI_FUNCTION' | 'WORKFLOW_TASK' | 'ADMIN_TOOL';

export interface RegistryEntry {
  id: string;
  component_code: string;
  component_name: string;
  description: string | null;
  registry_type: RegistryType;

  // UI & Navigation
  icon_name: string | null;
  route_path: string | null;
  widget_component_name: string;

  // Access Control
  required_permissions: string[];
  required_role_codes: string[];
  min_proficiency_level: string;

  // Functional Configuration
  supports_params: boolean;
  default_params: Record<string, any>;
  parameters_schema: Record<string, any>;

  // File System Integration
  creates_nodes: boolean;
  node_type_created: string | null;

  // UI Behaviour
  launch_in_modal: boolean;
  launch_in_sidebar: boolean;
  supports_full_screen: boolean;

  // State & Data Fetching
  data_fetch_query: string | null;
  realtime_updates: boolean;

  // Monitoring & Governance
  is_active: boolean;
  is_beta: boolean;
  version: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  last_modified_by: string | null;

  // Multi-tenancy
  app_uuid: string;
}

export interface CreateRegistryEntryInput {
  component_code: string;
  component_name: string;
  description?: string;
  registry_type?: RegistryType;
  icon_name?: string;
  route_path?: string;
  widget_component_name: string;
  required_permissions?: string[];
  required_role_codes?: string[];
  min_proficiency_level?: string;
  supports_params?: boolean;
  default_params?: Record<string, any>;
  parameters_schema?: Record<string, any>;
  creates_nodes?: boolean;
  node_type_created?: string;
  launch_in_modal?: boolean;
  launch_in_sidebar?: boolean;
  supports_full_screen?: boolean;
  data_fetch_query?: string;
  realtime_updates?: boolean;
  is_active?: boolean;
  is_beta?: boolean;
  version?: string;
}

export interface UpdateRegistryEntryInput extends Partial<CreateRegistryEntryInput> {
  id: string;
}

export interface RegistryFilters {
  registry_type?: RegistryType;
  is_active?: boolean;
  search?: string;
  app_uuid?: string;
}

export interface ComponentUsage {
  stakeholder_id: string;
  stakeholder_name: string;
  stakeholder_email: string;
  role_config_key: string;
}

export interface RegistryListResponse {
  data: RegistryEntry[];
  count: number;
  page: number;
  page_size: number;
}

export interface RegistryFormData {
  component_code: string;
  component_name: string;
  description: string;
  registry_type: RegistryType;
  icon_name: string;
  route_path: string;
  widget_component_name: string;
  required_permissions: string;
  required_role_codes: string;
  min_proficiency_level: string;
  supports_params: boolean;
  default_params: string; // JSON string
  parameters_schema: string; // JSON string
  creates_nodes: boolean;
  node_type_created: string;
  launch_in_modal: boolean;
  launch_in_sidebar: boolean;
  supports_full_screen: boolean;
  data_fetch_query: string;
  realtime_updates: boolean;
  is_active: boolean;
  is_beta: boolean;
  version: string;
}

export const REGISTRY_TYPES: { value: RegistryType; label: string }[] = [
  { value: 'UI_COMPONENT', label: 'UI Component' },
  { value: 'AI_FUNCTION', label: 'AI Function' },
  { value: 'WORKFLOW_TASK', label: 'Workflow Task' },
  { value: 'ADMIN_TOOL', label: 'Admin Tool' },
];

export const DEFAULT_REGISTRY_VALUES: Partial<CreateRegistryEntryInput> = {
  registry_type: 'UI_COMPONENT',
  required_permissions: [],
  required_role_codes: [],
  min_proficiency_level: 'awareness',
  supports_params: true,
  default_params: {},
  parameters_schema: {},
  creates_nodes: false,
  launch_in_modal: false,
  launch_in_sidebar: false,
  supports_full_screen: true,
  realtime_updates: false,
  is_active: true,
  is_beta: false,
  version: '1.0',
};
