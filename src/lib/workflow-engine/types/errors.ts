/**
 * Workflow Engine Error Types
 *
 * Custom error types for workflow execution
 */

// ============================================================================
// Error Type Codes
// ============================================================================

export type WorkflowErrorType =
  | 'TEMPLATE_NOT_FOUND'
  | 'INSTANCE_NOT_FOUND'
  | 'TASK_NOT_FOUND'
  | 'REGISTRY_FUNCTION_NOT_FOUND'
  | 'INVALID_CONTEXT'
  | 'INVALID_NODE_TYPE'
  | 'INVALID_TRANSITION'
  | 'CYCLE_DETECTED'
  | 'MAX_RECURSION_EXCEEDED'
  | 'NO_MATCHING_TRANSITION'
  | 'TASK_VALIDATION_FAILED'
  | 'OUTPUT_SCHEMA_VALIDATION_FAILED'
  | 'INPUT_SCHEMA_VALIDATION_FAILED'
  | 'CONCURRENT_MODIFICATION'
  | 'INVALID_STATE_TRANSITION'
  | 'JSONPATH_EVALUATION_FAILED'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_CONFIGURATION'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR'

// ============================================================================
// Workflow Error Class
// ============================================================================

export class WorkflowError extends Error {
  constructor(
    public readonly type: WorkflowErrorType,
    public readonly details: Record<string, unknown> = {},
    public readonly recoverable: boolean = false,
    message?: string
  ) {
    super(message || `Workflow Error: ${type}`)
    this.name = 'WorkflowError'

    // Maintains proper stack trace for where error was thrown (only available in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkflowError)
    }
  }

  /**
   * Convert error to JSON for logging and API responses
   */
  toJSON() {
    return {
      type: this.type,
      message: this.message,
      details: this.details,
      recoverable: this.recoverable,
      stack: this.stack,
    }
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(): boolean {
    return this.recoverable
  }

  /**
   * Create a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case 'TEMPLATE_NOT_FOUND':
        return 'The requested workflow template was not found.'
      case 'INSTANCE_NOT_FOUND':
        return 'The workflow instance was not found.'
      case 'TASK_NOT_FOUND':
        return 'The task was not found.'
      case 'REGISTRY_FUNCTION_NOT_FOUND':
        return 'The task function is not registered in the system.'
      case 'CYCLE_DETECTED':
        return 'A circular reference was detected in the workflow definition.'
      case 'MAX_RECURSION_EXCEEDED':
        return 'The workflow exceeded the maximum number of transitions.'
      case 'NO_MATCHING_TRANSITION':
        return 'No valid transition path was found for the current state.'
      case 'TASK_VALIDATION_FAILED':
        return 'The task data failed validation.'
      case 'CONCURRENT_MODIFICATION':
        return 'The workflow was modified by another process. Please retry.'
      case 'INVALID_STATE_TRANSITION':
        return 'The requested state transition is not allowed.'
      default:
        return 'An error occurred during workflow execution.'
    }
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

export function createTemplateNotFoundError(templateId: string): WorkflowError {
  return new WorkflowError(
    'TEMPLATE_NOT_FOUND',
    { templateId },
    false,
    `Workflow template not found: ${templateId}`
  )
}

export function createInstanceNotFoundError(instanceId: string): WorkflowError {
  return new WorkflowError(
    'INSTANCE_NOT_FOUND',
    { instanceId },
    false,
    `Workflow instance not found: ${instanceId}`
  )
}

export function createRegistryFunctionNotFoundError(
  functionCode: string,
  appUuid: string
): WorkflowError {
  return new WorkflowError(
    'REGISTRY_FUNCTION_NOT_FOUND',
    { functionCode, appUuid },
    false,
    `Function not found in registry: ${functionCode}`
  )
}

export function createCycleDetectedError(
  path: string[],
  nodeId: string
): WorkflowError {
  return new WorkflowError(
    'CYCLE_DETECTED',
    { path, nodeId, cycle: [...path, nodeId] },
    false,
    `Cycle detected in workflow: ${path.join(' → ')} → ${nodeId}`
  )
}

export function createMaxRecursionExceededError(
  path: string[],
  maxDepth: number
): WorkflowError {
  return new WorkflowError(
    'MAX_RECURSION_EXCEEDED',
    { path, maxDepth, currentDepth: path.length },
    false,
    `Maximum recursion depth exceeded: ${path.length} > ${maxDepth}`
  )
}

export function createNoMatchingTransitionError(
  gatewayNodeId: string,
  context: Record<string, unknown>
): WorkflowError {
  return new WorkflowError(
    'NO_MATCHING_TRANSITION',
    { gatewayNodeId, context },
    false,
    `No matching transition found for gateway: ${gatewayNodeId}`
  )
}

export function createTaskValidationError(
  taskId: string,
  errors: Array<{ field: string; message: string }>
): WorkflowError {
  return new WorkflowError(
    'TASK_VALIDATION_FAILED',
    { taskId, validationErrors: errors },
    true,
    `Task validation failed: ${errors.length} errors`
  )
}

export function createConcurrentModificationError(
  instanceId: string,
  expectedVersion: number,
  actualVersion: number
): WorkflowError {
  return new WorkflowError(
    'CONCURRENT_MODIFICATION',
    { instanceId, expectedVersion, actualVersion },
    true,
    `Workflow instance was modified concurrently`
  )
}

export function createJsonPathEvaluationError(
  expression: string,
  error: Error
): WorkflowError {
  return new WorkflowError(
    'JSONPATH_EVALUATION_FAILED',
    { expression, originalError: error.message },
    false,
    `JSONPath evaluation failed: ${expression}`
  )
}
