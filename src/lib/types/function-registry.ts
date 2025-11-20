/**
 * Sprint 1d.4: Function Registry Types
 * Layer 1: Registry Management for workflow task definitions
 */

// JSON Schema types
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer';
  description?: string;
  format?: string; // 'email', 'date', 'date-time', 'url', etc.
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JSONSchemaProperty; // For arrays
  properties?: Record<string, JSONSchemaProperty>; // For objects
  required?: string[]; // For objects
  default?: any;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  title?: string;
  description?: string;
}

// Implementation types
export type ImplementationType = 'USER_TASK' | 'SERVICE_TASK' | 'AI_AGENT_TASK';

// Widget types
export type WidgetType =
  | 'TextInput'
  | 'NumberInput'
  | 'DatePicker'
  | 'SelectField'
  | 'TextArea'
  | 'CheckboxField'
  | 'RadioGroup'
  | 'FileUpload';

export interface WidgetDefinition {
  widgetType: WidgetType;
  label?: string;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ label: string; value: any }>; // For SelectField, RadioGroup
  multiple?: boolean; // For SelectField
  rows?: number; // For TextArea
  accept?: string; // For FileUpload
}

// Function Registry Entry
export interface FunctionRegistryEntry {
  id: string;
  app_code: string | null;
  function_code: string;
  implementation_type: ImplementationType;
  endpoint_or_path: string | null;
  input_schema: JSONSchema;
  output_schema: JSONSchema;
  ui_widget_id: string | null;
  ui_definitions: WidgetDefinition | Record<string, any>;
  description: string | null;
  version: string;
  tags: string[];
  timeout_seconds: number;
  retry_count: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

// Create/Update inputs
export interface CreateFunctionRegistryInput {
  function_code: string;
  implementation_type: ImplementationType;
  description?: string;
  endpoint_or_path?: string; // Required for SERVICE_TASK and AI_AGENT_TASK
  input_schema: JSONSchema;
  output_schema: JSONSchema;
  ui_widget_id?: string; // Required for USER_TASK
  ui_definitions?: WidgetDefinition | Record<string, any>;
  version?: string;
  tags?: string[];
  timeout_seconds?: number;
  retry_count?: number;
  is_active?: boolean;
}

export interface UpdateFunctionRegistryInput extends Partial<CreateFunctionRegistryInput> {
  function_code: string; // Required for identification
}

// Filters
export interface FunctionRegistryFilters {
  implementation_type?: ImplementationType;
  is_active?: boolean;
  search?: string; // Search in function_code, description
  tags?: string[];
}

// API Response
export interface FunctionRegistryListResponse {
  data: FunctionRegistryEntry[];
  count: number;
  page: number;
  page_size: number;
}

// Validation
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

// Widget catalog for UI selection
export const WIDGET_CATALOG: Array<{ id: WidgetType; label: string; description: string }> = [
  { id: 'TextInput', label: 'Text Input', description: 'Single-line text field' },
  { id: 'NumberInput', label: 'Number Input', description: 'Numeric input field' },
  { id: 'DatePicker', label: 'Date Picker', description: 'Date selection widget' },
  { id: 'SelectField', label: 'Select Dropdown', description: 'Dropdown selection list' },
  { id: 'TextArea', label: 'Text Area', description: 'Multi-line text input' },
  { id: 'CheckboxField', label: 'Checkbox', description: 'Boolean checkbox' },
  { id: 'RadioGroup', label: 'Radio Group', description: 'Mutually exclusive options' },
  { id: 'FileUpload', label: 'File Upload', description: 'File attachment field' },
];

// Default values
export const DEFAULT_INPUT_SCHEMA: JSONSchema = {
  type: 'object',
  properties: {},
  required: [],
};

export const DEFAULT_OUTPUT_SCHEMA: JSONSchema = {
  type: 'object',
  properties: {
    result: {
      type: 'string',
      description: 'Task completion result',
    },
  },
  required: ['result'],
};
