// TypeScript type definitions for workspace functionality
// Aligned with database schema

// ============================================================================
// ENUMS & LITERALS
// ============================================================================

export type WorkspaceStatus = 'active' | 'archived' | 'suspended';
export type WorkspaceAccessRole = 'owner' | 'collaborator' | 'consultant' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

// ============================================================================
// CORE WORKSPACE TYPES
// ============================================================================

export interface Workspace {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  owner_stakeholder_id: string;
  app_uuid: string;
  primary_role_code: string;
  status: WorkspaceStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  created_from_template_id: string | null;
  tags: string[];
  is_public: boolean;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface WorkspaceDashboardConfiguration {
  id: string;
  config_name: string;
  description: string | null;
  dashboard_config: {
    menu_items: Array<{
      label: string;
      component_id: string;
      position: number;
      is_default?: boolean;
      icon?: string;
    }>;
    widgets: any[];
    workspace_layout: {
      sidebar_width?: string;
      theme?: string;
      show_notifications?: boolean;
      default_component?: string;
    };
    function_registry?: Array<{
      id: string;
      label: string;
      icon?: string;
      component_code: string;
      access_key?: string;
    }>;
  };
  created_by: string | null;
  app_uuid: string;
  version: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FileStructureFolder {
  name: string;
  description?: string;
  tags?: string[];
  subfolders?: FileStructureFolder[];
}

export interface WorkspaceFileStructureTemplate {
  id: string;
  template_name: string;
  description: string | null;
  structure_definition: {
    root_folders: FileStructureFolder[];
  };
  app_uuid: string;
  applicable_roles: string[];
  created_by: string | null;
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceBusinessServicesConfiguration {
  id: string;
  config_name: string;
  description: string | null;
  services_config: {
    workflows?: Array<{
      workflow_code: string;
      enabled: boolean;
      params?: Record<string, any>;
    }>;
    services?: Array<{
      service_name: string;
      config_override?: Record<string, any>;
    }>;
    notifications?: {
      channels: string[];
      rules: Array<{
        event: string;
        notify: string;
        frequency?: string;
      }>;
    };
    automation_rules?: Array<{
      trigger: string;
      condition?: string;
      action: string;
    }>;
  };
  app_uuid: string;
  created_by: string | null;
  is_active: boolean;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceConfiguration {
  id: string;
  workspace_id: string;
  dashboard_config_id: string | null;
  file_structure_template_id: string | null;
  business_services_config_id: string | null;
  applied_at: string;
  applied_by: string | null;
  is_active: boolean;

  // Joined data (when fetched with relations)
  dashboard_config?: WorkspaceDashboardConfiguration;
  file_structure_template?: WorkspaceFileStructureTemplate;
  business_services_config?: WorkspaceBusinessServicesConfiguration;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface WorkspaceTemplate {
  id: string;
  template_code: string;
  template_name: string;
  description: string | null;
  dashboard_config_id: string | null;
  file_structure_template_id: string | null;
  business_services_config_id: string | null;
  app_uuid: string;
  applicable_roles: string[];
  category: string | null;
  icon_name: string | null;
  preview_image_url: string | null;
  is_featured: boolean;
  is_system_template: boolean;
  is_active: boolean;
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined data (when fetched with relations)
  dashboard_config?: WorkspaceDashboardConfiguration;
  file_structure_template?: WorkspaceFileStructureTemplate;
  business_services_config?: WorkspaceBusinessServicesConfiguration;
}

// ============================================================================
// ACCESS CONTROL TYPES
// ============================================================================

export interface WorkspacePermissions {
  can_edit_dashboard?: boolean;
  can_manage_files?: boolean;
  can_invite_users?: boolean;
  can_configure_services?: boolean;
  can_view_audit_logs?: boolean;
  can_delete_workspace?: boolean;
}

export interface WorkspaceAccessControl {
  id: string;
  workspace_id: string;
  stakeholder_id: string;
  access_role: WorkspaceAccessRole;
  permissions: WorkspacePermissions;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  invitation_status: InvitationStatus;
  granted_at: string;
  expires_at: string | null;
  last_accessed_at: string | null;

  // Joined data (when fetched with relations)
  stakeholder?: {
    id: string;
    name: string;
    email: string | null;
    reference: string;
  };
  invited_by_stakeholder?: {
    id: string;
    name: string;
    email: string | null;
  };
}

// ============================================================================
// COMPOSITE TYPES
// ============================================================================

export interface WorkspaceWithDetails extends Workspace {
  configuration?: WorkspaceConfiguration;
  access_control: WorkspaceAccessControl[];
  owner: {
    id: string;
    name: string;
    email: string | null;
    reference: string;
  };
  current_user_access?: WorkspaceAccessControl;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Workspace Creation
export interface CreateWorkspaceRequest {
  name: string;
  primary_role_code: string;
  template_id?: string;
  description?: string;
  owner_stakeholder_id?: string;
}

export interface CreateWorkspaceResponse {
  success: boolean;
  workspace_id: string;
  workspace_reference: string;
  root_folder_id: string;
  folders_created: number;
  message: string;
}

// Workspace Update
export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  status?: WorkspaceStatus;
  tags?: string[];
}

// Access Control
export interface GrantAccessRequest {
  stakeholder_id: string;
  access_role: WorkspaceAccessRole;
  permissions?: WorkspacePermissions;
  expires_at?: string;
}

export interface UpdateAccessRequest {
  access_role?: WorkspaceAccessRole;
  permissions?: WorkspacePermissions;
  invitation_status?: InvitationStatus;
  expires_at?: string;
}

// Configuration Management
export interface UpdateWorkspaceConfigurationRequest {
  dashboard_config_id?: string;
  file_structure_template_id?: string;
  business_services_config_id?: string;
}

// Template Creation (Admin)
export interface CreateTemplateRequest {
  template_code: string;
  template_name: string;
  description?: string;
  dashboard_config_id?: string;
  file_structure_template_id?: string;
  business_services_config_id?: string;
  applicable_roles: string[];
  category?: string;
  icon_name?: string;
  preview_image_url?: string;
  is_featured?: boolean;
}

// ============================================================================
// API RESPONSE WRAPPERS
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type WorkspaceListItem = Pick<
  Workspace,
  'id' | 'reference' | 'name' | 'description' | 'status' | 'created_at' | 'primary_role_code'
> & {
  current_user_role: WorkspaceAccessRole;
  collaborator_count: number;
};

export interface WorkspaceStats {
  total_workspaces: number;
  active_workspaces: number;
  archived_workspaces: number;
  owned_workspaces: number;
  collaborator_workspaces: number;
  total_collaborators: number;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface WorkspaceFilters {
  status?: WorkspaceStatus | WorkspaceStatus[];
  primary_role_code?: string | string[];
  search?: string;
  tags?: string[];
  created_after?: string;
  created_before?: string;
}

export interface WorkspaceQueryParams extends WorkspaceFilters {
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'updated_at' | 'name';
  sort_order?: 'asc' | 'desc';
}

// ============================================================================
// EVENT TYPES (for audit logs)
// ============================================================================

export type WorkspaceEventType =
  | 'workspace_created'
  | 'workspace_updated'
  | 'workspace_archived'
  | 'workspace_restored'
  | 'workspace_deleted'
  | 'access_granted'
  | 'access_revoked'
  | 'access_updated'
  | 'collaborator_invited'
  | 'collaborator_accepted'
  | 'collaborator_declined'
  | 'config_changed'
  | 'template_applied'
  | 'file_structure_initialized';

export interface WorkspaceAuditLog {
  id: string;
  event_type: WorkspaceEventType;
  stakeholder_id: string;
  workspace_id: string;
  metadata: Record<string, any>;
  created_at: string;
}
