/**
 * Sprint 1d.4 Enhancement: Workflow Instance Types
 * Types for creating and managing workflow instances from templates
 */

export type WorkflowInstanceStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SUSPENDED';
export type InstanceTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

/**
 * Workflow Instance - represents a running/completed workflow
 */
export interface WorkflowInstance {
  id: string;
  app_uuid: string;
  workflow_template_id: string;
  template_code: string;
  current_node_id: string | null;
  status: WorkflowInstanceStatus;
  instance_context: Record<string, any>;
  initial_context?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
}

/**
 * Instance Task - represents a single task within a workflow instance
 */
export interface InstanceTask {
  id: string;
  workflow_instance_id: string;
  node_id: string;
  function_code: string;
  task_type: 'USER_TASK' | 'SERVICE_TASK' | 'AI_AGENT_TASK';
  status: InstanceTaskStatus;
  assigned_to?: string; // stakeholder_id (NULL for SERVICE_TASK)
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  context: Record<string, any>;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

/**
 * Task Assignment - maps node IDs to stakeholder IDs
 */
export interface TaskAssignments {
  [nodeId: string]: string; // nodeId -> stakeholder_id
}

/**
 * Create Instance Input - request body for instance creation
 */
export interface CreateInstanceInput {
  workflow_template_id: string;
  task_assignments: TaskAssignments;
  initial_context?: Record<string, any>;
}

/**
 * Create Instance Response - success response
 */
export interface CreateInstanceResponse {
  success: boolean;
  instance_id: string;
  status: WorkflowInstanceStatus;
  first_task_id?: string;
  message: string;
}

/**
 * Instance Details Response - full instance details
 */
export interface InstanceDetailsResponse {
  instance: WorkflowInstance;
  tasks: InstanceTask[];
  template: {
    id: string;
    template_code: string;
    name: string;
    workflow_type: string;
    definition: any;
  };
}

/**
 * Task Assignment Field - for UI component
 */
export interface TaskAssignmentField {
  node_id: string;
  task_name: string;
  function_code: string;
  task_type: 'USER_TASK' | 'SERVICE_TASK' | 'AI_AGENT_TASK';
  assigned_stakeholder_id?: string;
  requires_assignment: boolean;
}
