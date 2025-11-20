/**
 * Sprint 1d.4 - Fix 3: Workflow Tasks Widget
 * Implemented in Phase 1d: Complete Workflow Operations Layer
 * Displays and allows execution of workflow tasks assigned to the current user
 */

'use client';

import { TaskExecutionWidget } from '@/components/dashboard/TaskExecutionWidget';

export default function WorkflowTasksWidget() {
  return <TaskExecutionWidget />;
}
