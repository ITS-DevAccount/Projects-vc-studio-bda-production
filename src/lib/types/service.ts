// Sprint 1d.5: Service Task Execution System
// TypeScript types for service entities

// ============================================================================
// Service Configuration Types
// ============================================================================

export type ServiceType = 'REAL' | 'MOCK';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type AuthenticationType = 'api_key' | 'bearer' | 'custom_header' | 'basic_auth';

export interface ServiceAuthentication {
  type?: AuthenticationType;
  api_key?: string;
  bearer_token?: string;
  username?: string; // For basic_auth
  password?: string; // For basic_auth
  header_name?: string; // For api_key or custom_header
  header_value?: string; // For custom_header
  headers?: Record<string, string>;
}

export interface ErrorScenario {
  name: string;
  probability: number; // 0.0 to 1.0
  delay_ms?: number;
  status_code?: number;
  response: object;
}

export interface MockServiceDefinition {
  success_response: object;
  error_scenarios?: ErrorScenario[];
}

export interface ServiceConfiguration {
  service_config_id: string;
  app_uuid: string;
  service_name: string;
  service_type: ServiceType;

  // For REAL services
  endpoint_url?: string;
  http_method?: HttpMethod;
  timeout_seconds?: number;
  max_retries?: number;
  authentication?: ServiceAuthentication;

  // For MOCK services
  mock_template_id?: string;
  mock_definition?: MockServiceDefinition;

  // Common fields
  is_active?: boolean;
  description?: string;

  // Audit fields
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceConfigurationInput {
  service_name: string;
  service_type: ServiceType;
  endpoint_url?: string;
  http_method?: HttpMethod;
  timeout_seconds?: number;
  max_retries?: number;
  authentication?: ServiceAuthentication;
  mock_template_id?: string;
  mock_definition?: MockServiceDefinition;
  is_active?: boolean;
  description?: string;
}

export interface UpdateServiceConfigurationInput {
  service_name?: string;
  endpoint_url?: string;
  http_method?: HttpMethod;
  timeout_seconds?: number;
  max_retries?: number;
  authentication?: ServiceAuthentication;
  mock_template_id?: string;
  mock_definition?: MockServiceDefinition;
  is_active?: boolean;
  description?: string;
}

// ============================================================================
// Service Task Queue Types
// ============================================================================

export type QueueStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface ServiceTaskQueueItem {
  queue_id: string;
  app_uuid: string;
  instance_id: string;
  task_id: string;
  service_config_id: string;
  status: QueueStatus;
  input_data?: object;
  output_data?: object;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  last_attempt_at?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateQueueItemInput {
  instance_id: string;
  task_id: string;
  service_config_id: string;
  input_data?: object;
  max_retries?: number;
}

// ============================================================================
// Service Execution Log Types
// ============================================================================

export type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'ERROR';

export interface ServiceExecutionLog {
  log_id: string;
  app_uuid: string;
  instance_id?: string;
  task_id?: string;
  service_config_id?: string;
  service_name: string;
  status: ExecutionStatus;
  request_data?: object;
  response_data?: object;
  error_message?: string;
  execution_time_ms?: number;
  http_status_code?: number;
  retry_attempt: number;
  created_at: string;
}

export interface ServiceExecutionStats {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_execution_time_ms: number;
  success_rate: number;
}

// ============================================================================
// Service Client Types
// ============================================================================

export interface ServiceResponse {
  status: 'success' | 'error';
  data?: object;
  error?: string;
  statusCode?: number;
  executionTimeMs?: number;
}

export interface ServiceClient {
  execute(
    endpoint: string,
    input: object,
    config: ServiceConfiguration
  ): Promise<ServiceResponse>;
}

// ============================================================================
// Mock Service Template Types
// ============================================================================

export interface MockServiceTemplate {
  template_id: string;
  service_name: string;
  description: string;
  success_response: object;
  error_scenarios?: ErrorScenario[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ServiceConfigurationListResponse {
  services: ServiceConfiguration[];
  total: number;
  page: number;
  page_size: number;
}

export interface ServiceExecutionLogsResponse {
  logs: ServiceExecutionLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface ServiceTestResponse {
  status: 'success' | 'error';
  response: object;
  execution_time_ms: number;
}

// ============================================================================
// Form Types
// ============================================================================

export interface ServiceConfigurationFormData {
  service_name: string;
  service_type: ServiceType;
  description: string;

  // REAL service fields
  endpoint_url: string;
  http_method: HttpMethod;
  timeout_seconds: number;
  max_retries: number;
  auth_type: AuthenticationType | '';
  api_key: string;
  bearer_token: string;
  custom_headers: string; // JSON string

  // MOCK service fields
  mock_template_id: string;
  mock_definition: string; // JSON string

  is_active: boolean;
}

export const DEFAULT_SERVICE_FORM_VALUES: ServiceConfigurationFormData = {
  service_name: '',
  service_type: 'MOCK',
  description: '',
  endpoint_url: '',
  http_method: 'POST',
  timeout_seconds: 30,
  max_retries: 3,
  auth_type: '',
  api_key: '',
  bearer_token: '',
  custom_headers: '{}',
  mock_template_id: '',
  mock_definition: '{"success_response": {}}',
  is_active: true,
};

// ============================================================================
// Filter Types
// ============================================================================

export interface ServiceConfigurationFilters {
  service_type?: ServiceType;
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ServiceExecutionLogFilters {
  service_config_id?: string;
  service_name?: string;
  status?: ExecutionStatus;
  instance_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}
