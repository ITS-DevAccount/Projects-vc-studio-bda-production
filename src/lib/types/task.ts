/**
 * Sprint 1d.4: Task Types
 * Layer 3: Task Execution and Handler
 */

import type { JSONSchema, ImplementationType, WidgetDefinition } from './function-registry';

// Task status
export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

// Instance task (from instance_tasks table)
export interface InstanceTask {
  id: string;
  app_code: string;
  workflow_instance_id: string;
  workflow_code: string;
  function_code: string;
  node_id: string;
  task_type: ImplementationType;
  status: TaskStatus;
  input_data: Record<string, any>;
  output_data: Record<string, any> | null;
  assigned_to: string | null; // Stakeholder UUID
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Task with function details (joined from function_registry)
export interface TaskWithFunction extends InstanceTask {
  // From function_registry
  function_name?: string;
  description: string | null;
  input_schema: JSONSchema;
  output_schema: JSONSchema;
  ui_widget_id: string | null;
  ui_definitions: WidgetDefinition | Record<string, any>;
}

// Task filters
export interface TaskFilters {
  status?: TaskStatus;
  task_type?: ImplementationType;
  assigned_to?: string;
  workflow_instance_id?: string;
}

// API Response
export interface PendingTasksResponse {
  tasks: TaskWithFunction[];
  count: number;
}

// Task completion input
export interface CompleteTaskInput {
  output: Record<string, any>;
}

// Task completion response
export interface CompleteTaskResponse {
  success: boolean;
  task_id: string;
  instance_id: string;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

// Task update strategy (abstraction layer for polling)
export interface TaskUpdateStrategy {
  start: () => void;
  stop: () => void;
  refresh: () => Promise<void>;
  onUpdate: (callback: (tasks: TaskWithFunction[]) => void) => void;
}

// Polling strategy implementation
export class PollingTaskUpdateStrategy implements TaskUpdateStrategy {
  private intervalId: NodeJS.Timeout | null = null;
  private callback: ((tasks: TaskWithFunction[]) => void) | null = null;
  private interval: number;
  private fetchFunction: () => Promise<TaskWithFunction[]>;

  constructor(fetchFunction: () => Promise<TaskWithFunction[]>, intervalMs: number = 10000) {
    this.fetchFunction = fetchFunction;
    this.interval = intervalMs;
  }

  start(): void {
    if (this.intervalId) return; // Already started

    // Initial fetch
    this.refresh();

    // Set up polling
    this.intervalId = setInterval(() => {
      this.refresh();
    }, this.interval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async refresh(): Promise<void> {
    try {
      const tasks = await this.fetchFunction();
      if (this.callback) {
        this.callback(tasks);
      }
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
  }

  onUpdate(callback: (tasks: TaskWithFunction[]) => void): void {
    this.callback = callback;
  }
}

// Future: WebSocket strategy (placeholder)
export class WebSocketTaskUpdateStrategy implements TaskUpdateStrategy {
  start(): void {
    // TODO: Implement WebSocket connection
    console.log('WebSocket strategy not yet implemented');
  }

  stop(): void {
    // TODO: Close WebSocket
  }

  async refresh(): Promise<void> {
    // TODO: Request refresh via WebSocket
  }

  onUpdate(callback: (tasks: TaskWithFunction[]) => void): void {
    // TODO: Set up WebSocket message handler
  }
}

// Form field value type
export type FieldValue = string | number | boolean | Date | string[] | null | undefined;

// Form data for task execution
export interface TaskFormData {
  [fieldName: string]: FieldValue;
}

// Form validation error
export interface FormValidationError {
  field: string;
  message: string;
}

// Form validation result
export interface FormValidationResult {
  valid: boolean;
  errors: FormValidationError[];
}
