/**
 * Sprint 1d.6: Workflow Monitoring Types
 * Types for monitoring dashboard, audit trail, and analytics
 */

import { WorkflowInstanceStatus, InstanceTaskStatus } from './workflow-instance';

// ============================================================================
// WORKFLOW HISTORY / AUDIT EVENTS
// ============================================================================

export type WorkflowEventType =
  | 'INSTANCE_CREATED'
  | 'NODE_TRANSITION'
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_RETRIED'
  | 'SERVICE_CALLED'
  | 'SERVICE_RESPONSE'
  | 'WORKFLOW_COMPLETED'
  | 'WORKFLOW_FAILED'
  | 'WORKFLOW_PAUSED'
  | 'WORKFLOW_RESUMED'
  | 'CONTEXT_UPDATED';

export interface WorkflowHistoryEvent {
  id: string;
  app_uuid: string;
  workflow_instance_id: string;
  event_type: WorkflowEventType;
  event_timestamp: string;

  // Related entities
  node_id?: string;
  task_id?: string;
  user_id?: string;
  stakeholder_id?: string;

  // Event details
  event_data: Record<string, any>;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;

  // Additional metadata
  error_message?: string;
  metadata: Record<string, any>;

  created_at: string;
}

// ============================================================================
// MONITORING DASHBOARD - ACTIVE INSTANCES
// ============================================================================

export interface MonitoringInstanceSummary {
  id: string;
  instance_name: string | null;
  workflow_code: string;
  workflow_name: string;
  workflow_type: string;
  status: WorkflowInstanceStatus;
  current_node_id: string | null;
  current_node_name: string | null;

  // Progress metrics
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  failed_tasks: number;
  progress_percentage: number;

  // Timing
  created_at: string;
  updated_at: string;
  completed_at?: string;
  elapsed_seconds: number;

  // Next action
  next_assigned_to?: string;
  next_assigned_to_name?: string;
}

export interface MonitoringInstancesResponse {
  instances: MonitoringInstanceSummary[];
  count: number;
  stats: {
    running: number;
    completed: number;
    failed: number;
    suspended: number;
  };
}

// ============================================================================
// INSTANCE DETAILS EXPLORER
// ============================================================================

export interface InstanceTaskDetail {
  id: string;
  node_id: string;
  node_name: string;
  function_code: string;
  task_type: 'USER_TASK' | 'SERVICE_TASK' | 'AI_AGENT_TASK';
  status: InstanceTaskStatus;

  assigned_to?: string;
  assigned_to_name?: string;

  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  context: Record<string, any>;

  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;

  duration_seconds?: number;
  error_message?: string;
}

export interface InstanceExecutionPath {
  node_id: string;
  node_name: string;
  node_type: 'START' | 'TASK' | 'GATEWAY' | 'END';
  entered_at: string;
  exited_at?: string;
  duration_seconds?: number;
}

export interface InstanceDetailsResponse {
  instance: {
    id: string;
    instance_name: string | null;
    workflow_code: string;
    status: WorkflowInstanceStatus;
    current_node_id: string | null;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    elapsed_seconds: number;
    instance_context: Record<string, any>;
    initial_context?: Record<string, any>;
  };
  template: {
    id: string;
    template_code: string;
    name: string;
    workflow_type: string;
    definition: any;
  };
  tasks: InstanceTaskDetail[];
  execution_path: InstanceExecutionPath[];
  metrics: {
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    failed_tasks: number;
    average_task_duration: number;
  };
}

// ============================================================================
// AUDIT HISTORY
// ============================================================================

export interface AuditEventDetail extends WorkflowHistoryEvent {
  // Enriched data for display
  user_name?: string;
  stakeholder_name?: string;
  node_name?: string;
  task_name?: string;
}

export interface AuditHistoryFilters {
  event_type?: WorkflowEventType;
  start_date?: string;
  end_date?: string;
  user_id?: string;
  node_id?: string;
  task_id?: string;
}

export interface AuditHistoryResponse {
  events: AuditEventDetail[];
  count: number;
  filters: AuditHistoryFilters;
}

// ============================================================================
// BOTTLENECK ANALYSIS
// ============================================================================

export interface BottleneckMetric {
  node_id: string;
  node_name: string;
  function_code?: string;
  workflow_type: string;

  // Time metrics
  total_executions: number;
  average_duration: number;
  median_duration: number;
  p95_duration: number;
  min_duration: number;
  max_duration: number;
  std_deviation: number;

  // SLA comparison (if defined)
  sla_target?: number;
  sla_compliance_percentage?: number;

  // Status counts
  completed_count: number;
  failed_count: number;
  failure_rate: number;
}

export interface BottleneckAnalysisResponse {
  bottlenecks: BottleneckMetric[];
  by_workflow_type: Record<string, BottleneckMetric[]>;
  overall_stats: {
    total_workflows: number;
    total_tasks: number;
    average_workflow_duration: number;
    date_range: {
      start: string;
      end: string;
    };
  };
}

// ============================================================================
// CYCLE TIME REPORTING
// ============================================================================

export interface CycleTimeMetric {
  workflow_type: string;
  workflow_name: string;

  // Duration metrics
  total_instances: number;
  average_duration: number;
  median_duration: number;
  p95_duration: number;
  min_duration: number;
  max_duration: number;

  // Status breakdown
  completed_count: number;
  failed_count: number;
  running_count: number;

  // SLA metrics
  sla_target?: number;
  sla_compliance_percentage?: number;
  within_sla_count?: number;
  exceeded_sla_count?: number;
}

export interface CycleTimeTrend {
  date: string;
  average_duration: number;
  instance_count: number;
  completed_count: number;
  failed_count: number;
}

export interface CycleTimeDistribution {
  duration_bucket: string; // "0-1h", "1-4h", "4-24h", "1-7d", "7d+"
  instance_count: number;
  percentage: number;
}

export interface CycleTimeResponse {
  metrics: CycleTimeMetric[];
  trends: CycleTimeTrend[];
  distribution: CycleTimeDistribution[];
  overall_stats: {
    total_workflows: number;
    average_duration: number;
    median_duration: number;
    date_range: {
      start: string;
      end: string;
    };
  };
}

// ============================================================================
// COMPLIANCE REPORTING
// ============================================================================

export type ComplianceReportType =
  | 'FULL_AUDIT_TRAIL'
  | 'DATA_LINEAGE'
  | 'USER_ACTIONS'
  | 'MULTI_TENANT_ISOLATION'
  | 'DATA_RETENTION'
  | 'SERVICE_INTEGRATION_AUDIT';

export interface ComplianceReportRequest {
  report_type: ComplianceReportType;
  workflow_instance_id?: string;
  start_date?: string;
  end_date?: string;
  include_pii?: boolean;
  export_format?: 'PDF' | 'CSV' | 'JSON' | 'EXCEL';
}

export interface ComplianceReportMetadata {
  report_id: string;
  report_type: ComplianceReportType;
  generated_at: string;
  generated_by: string;
  date_range: {
    start: string;
    end: string;
  };
  record_count: number;
  app_uuid: string;
}

export interface ComplianceReportResponse {
  metadata: ComplianceReportMetadata;
  data: any[]; // Specific to report type
  download_url?: string; // For file exports
}

// ============================================================================
// FILTERS & QUERY PARAMS
// ============================================================================

export interface MonitoringFilters {
  status?: WorkflowInstanceStatus[];
  workflow_type?: string[];
  start_date?: string;
  end_date?: string;
  search?: string; // Search by instance name
}

export interface MonitoringQueryParams extends MonitoringFilters {
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'updated_at' | 'elapsed_seconds' | 'progress_percentage';
  sort_order?: 'asc' | 'desc';
}

// ============================================================================
// EXPORT FORMATS
// ============================================================================

export type ExportFormat = 'CSV' | 'JSON' | 'PDF' | 'EXCEL';

export interface ExportRequest {
  format: ExportFormat;
  filters?: MonitoringFilters | AuditHistoryFilters;
  include_headers?: boolean;
  filename?: string;
}

export interface ExportResponse {
  success: boolean;
  filename: string;
  download_url: string;
  file_size: number;
  record_count: number;
}
