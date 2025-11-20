/**
 * Sprint 1d.4: Workflow Types
 * Layer 2: Workflow Designer and Template Management
 */

// Node types in workflow
export type NodeType = 'START' | 'TASK' | 'GATEWAY' | 'END';

// Gateway types (decision points)
export type GatewayType = 'EXCLUSIVE' | 'PARALLEL' | 'INCLUSIVE';

// Workflow node definition
export interface WorkflowNode {
  id: string; // Unique node ID (e.g., 'node_1', 'start', 'end')
  type: NodeType;
  label: string; // Display name
  position: { x: number; y: number }; // Canvas position

  // For TASK nodes
  function_code?: string; // References function_registry.function_code

  // For GATEWAY nodes
  gateway_type?: GatewayType;

  // Additional config
  config?: Record<string, any>;
}

// Workflow transition (arrow between nodes)
export interface WorkflowTransition {
  id: string; // Unique transition ID
  from_node_id: string; // Source node
  to_node_id: string; // Target node
  label?: string; // Display label on arrow
  condition?: string; // Condition expression (e.g., "${approved} === true")
  priority?: number; // Order of evaluation (for gateways)
}

// Complete workflow definition (stored in workflow_templates.definition)
export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  transitions: WorkflowTransition[];
  metadata: {
    version?: string;
    author?: string;
    created_at?: string;
    updated_at?: string;
    description?: string;
  };
}

// Workflow template
export interface WorkflowTemplate {
  id: string;
  template_code: string;
  workflow_type: string;
  name: string;
  description: string | null;
  maturity_gate: string | null;
  app_uuid: string;
  definition: WorkflowDefinition;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  workflow_type_id: string | null;
}

// Create/Update inputs
export interface CreateWorkflowTemplateInput {
  template_code: string;
  workflow_type: string;
  name: string;
  description?: string;
  maturity_gate?: string | null;
  definition: WorkflowDefinition;
  is_active?: boolean;
}

export interface UpdateWorkflowTemplateInput extends Partial<CreateWorkflowTemplateInput> {
  id: string;
}

// Workflow filters
export interface WorkflowTemplateFilters {
  workflow_type?: string;
  is_active?: boolean;
  search?: string;
  maturity_gate?: string;
}

// API Response
export interface WorkflowTemplateListResponse {
  data: WorkflowTemplate[];
  count: number;
  page: number;
  page_size: number;
}

// Canvas/Designer state
export interface CanvasState {
  nodes: WorkflowNode[];
  transitions: WorkflowTransition[];
  selectedNodeId: string | null;
  selectedTransitionId: string | null;
  zoom: number;
  panOffset: { x: number; y: number };
}

// Validation
export interface WorkflowValidationError {
  type: 'node' | 'transition' | 'structure';
  nodeId?: string;
  transitionId?: string;
  message: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationError[];
}

// Helper functions for workflow creation
export const createEmptyWorkflowDefinition = (): WorkflowDefinition => ({
  nodes: [
    {
      id: 'start',
      type: 'START',
      label: 'Start',
      position: { x: 100, y: 100 },
    },
    {
      id: 'end',
      type: 'END',
      label: 'End',
      position: { x: 500, y: 100 },
    },
  ],
  transitions: [],
  metadata: {
    version: '1.0',
    created_at: new Date().toISOString(),
  },
});

export const createTaskNode = (
  id: string,
  functionCode: string,
  label: string,
  position: { x: number; y: number }
): WorkflowNode => ({
  id,
  type: 'TASK',
  label,
  function_code: functionCode,
  position,
});

export const createGatewayNode = (
  id: string,
  label: string,
  gatewayType: GatewayType,
  position: { x: number; y: number }
): WorkflowNode => ({
  id,
  type: 'GATEWAY',
  label,
  gateway_type: gatewayType,
  position,
});

export const createTransition = (
  id: string,
  fromNodeId: string,
  toNodeId: string,
  condition?: string,
  label?: string
): WorkflowTransition => ({
  id,
  from_node_id: fromNodeId,
  to_node_id: toNodeId,
  condition,
  label,
});

// Workflow types catalog
export const WORKFLOW_TYPES = [
  { value: 'Custom', label: 'Custom Workflow' },
  { value: 'FLM', label: 'FLM (First Level Maturity)' },
  { value: 'AGM', label: 'AGM (Agricultural Maturity)' },
  { value: 'Full', label: 'Full Maturity' },
  { value: 'Onboarding', label: 'Stakeholder Onboarding' },
  { value: 'Approval', label: 'Approval Process' },
];

// Maturity gates
export const MATURITY_GATES = [
  { value: 'FLM', label: 'FLM - First Level Maturity' },
  { value: 'AGM', label: 'AGM - Advanced Maturity' },
  { value: 'Full', label: 'Full - Complete Maturity' },
];
