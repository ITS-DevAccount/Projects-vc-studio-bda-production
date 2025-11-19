# Workflow Engine - State Machine and Task Orchestration

**Sprint 1d.3**: Core workflow engine implementation using deterministic state machine pattern

## Overview

The Workflow Engine is a runtime orchestrator that executes workflow instances using a state machine pattern. It manages:

- **State transitions** based on current node evaluation
- **Task node evaluation** and work token creation
- **Gateway condition evaluation** using JSONPath
- **Context management** with scoping (global/task-local)
- **Registry-based task implementation** decoupling
- **Comprehensive execution logging** for audit trails

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Engine                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐      ┌──────────────────┐              │
│  │ State Machine  │─────▶│ Node Evaluator   │              │
│  │  Evaluator     │      │                  │              │
│  └────────────────┘      └──────────────────┘              │
│          │                                                   │
│          ├──────────────┐                                   │
│          │              │                                   │
│  ┌────────────────┐  ┌──────────────────┐                 │
│  │ Recursion      │  │ Condition        │                 │
│  │  Guard         │  │  Evaluator       │                 │
│  └────────────────┘  └──────────────────┘                 │
│                                                               │
│  ┌────────────────────────────────────────┐                │
│  │         Context Manager                 │                │
│  │  (Global / Task-Local / Node-Local)    │                │
│  └────────────────────────────────────────┘                │
│                                                               │
│  ┌────────────────┐  ┌──────────────────┐                 │
│  │ Registry       │  │ Agent            │                 │
│  │  Lookup        │  │  Determination   │                 │
│  └────────────────┘  └──────────────────┘                 │
│                                                               │
│  ┌────────────────┐  ┌──────────────────┐                 │
│  │ Work Token     │  │ Execution        │                 │
│  │  Creator       │  │  Logger          │                 │
│  └────────────────┘  └──────────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### State Machine Flow

```
Instance Created
     │
     ▼
Evaluate Current Node
     │
     ├─▶ TASK_NODE ──▶ Create Work Token ──▶ WAIT for completion
     │                          │
     │                          ▼
     │                    Task Completes ──▶ Update Context
     │                          │
     │                          ▼
     │                    Transition to Next Node
     │
     ├─▶ GATEWAY_NODE ──▶ Evaluate Condition
     │         │              │
     │         │              ├─▶ Condition True ──▶ Transition
     │         │              └─▶ Condition False ──▶ Transition
     │         │
     │         └─▶ Recursive Evaluation (gateway chains)
     │
     └─▶ END_NODE ──▶ Mark Complete
```

## Database Schema

### Tables Created

- **workflow_definitions**: Workflow templates with node/transition definitions
- **function_registry**: Task function implementations and configurations
- **workflow_engine_instances**: Active workflow instances with state
- **instance_tasks**: Work tokens for task execution
- **instance_context**: Context data with scoping
- **workflow_history**: Comprehensive audit trail

See: `/supabase/migrations/20251119_create_workflow_engine_tables.sql`

## API Endpoints

### POST /api/workflows/instances/create

Creates a new workflow instance from a template.

**Request:**
```json
{
  "workflowTemplateId": "uuid",
  "initialContext": {
    "stakeholderName": "Acme Corp",
    "amount": 1000
  },
  "stakeholderId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "instance": {
    "id": "uuid",
    "instanceCode": "WF-TEMPLATE-1234567890-abc123",
    "status": "PENDING_TASK",
    "currentNodeId": "task_1"
  },
  "workToken": {
    "id": "uuid",
    "taskCode": "WF-...-task_1-...",
    "functionCode": "verify_documents",
    "implementationType": "USER_TASK",
    "status": "PENDING"
  }
}
```

### GET /api/workflows/instances/:instanceId

Retrieves full workflow instance details.

**Response:**
```json
{
  "instance": { ... },
  "definition": { ... },
  "workTokens": [ ... ],
  "context": { ... },
  "history": [ ... ]
}
```

### POST /api/workflows/instances/:instanceId/task-complete

Completes a task and continues workflow execution.

**Request:**
```json
{
  "workTokenId": "uuid",
  "outputData": {
    "documentsVerified": true,
    "verificationDate": "2025-11-19"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "instanceId": "uuid",
    "currentNodeId": "task_2",
    "status": "PENDING_TASK",
    "workTokensCreated": ["uuid"],
    "transitionsTaken": ["task_2"]
  }
}
```

### POST /api/workflows/instances/:instanceId/execute

Manually continues workflow execution from current state.

**Response:**
```json
{
  "success": true,
  "result": {
    "instanceId": "uuid",
    "currentNodeId": "end",
    "status": "COMPLETED",
    "workTokensCreated": [],
    "transitionsTaken": ["gateway_1", "end"]
  }
}
```

## Usage Examples

### 1. Create Workflow Definition

```typescript
import { createWorkflowDefinition } from '@/lib/db/workflows'
import { createServerClient } from '@/lib/supabase/server'

const definition = await createWorkflowDefinition(supabase, {
  templateCode: 'client-onboarding',
  templateName: 'Client Onboarding Workflow',
  description: 'Standard client onboarding process',
  rootNodeId: 'start',
  definitionJson: {
    nodes: {
      start: {
        id: 'start',
        type: 'START_NODE',
        name: 'Start',
        nextNodeId: 'verify_documents'
      },
      verify_documents: {
        id: 'verify_documents',
        type: 'TASK_NODE',
        name: 'Verify Documents',
        functionCode: 'verify_documents',
        assignedRole: 'admin',
        inputMapping: {
          stakeholderName: '$.stakeholderName'
        },
        outputMapping: {
          documentsVerified: '$.verified',
          verificationDate: '$.completedAt'
        },
        nextNodeId: 'check_verification'
      },
      check_verification: {
        id: 'check_verification',
        type: 'GATEWAY_NODE',
        name: 'Check Verification Result',
        gatewayType: 'EXCLUSIVE',
        transitions: [
          {
            id: 'verified',
            condition: '$.documentsVerified == true',
            targetNodeId: 'approve'
          },
          {
            id: 'rejected',
            isDefault: true,
            targetNodeId: 'reject'
          }
        ]
      },
      approve: {
        id: 'approve',
        type: 'END_NODE',
        name: 'Approved',
        outcome: 'SUCCESS'
      },
      reject: {
        id: 'reject',
        type: 'END_NODE',
        name: 'Rejected',
        outcome: 'FAILURE'
      }
    }
  },
  appUuid,
  createdBy: userId
})
```

### 2. Register Function Implementation

```typescript
import { SupabaseClient } from '@supabase/supabase-js'

await supabase.from('function_registry').insert({
  function_code: 'verify_documents',
  function_name: 'Verify Identity Documents',
  description: 'Manual verification of stakeholder identity documents',
  implementation_type: 'USER_TASK',
  input_schema: {
    type: 'object',
    properties: {
      stakeholderName: { type: 'string' }
    },
    required: ['stakeholderName']
  },
  output_schema: {
    type: 'object',
    properties: {
      verified: { type: 'boolean' },
      completedAt: { type: 'string', format: 'date-time' }
    },
    required: ['verified']
  },
  config: {
    uiWidgetId: 'document-verification-form',
    allowedRoles: ['admin', 'compliance_officer']
  },
  app_uuid: appUuid,
  version: 1,
  is_active: true
})
```

### 3. Create and Execute Workflow Instance

```typescript
// Create instance
const response = await fetch('/api/workflows/instances/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workflowTemplateId: definition.id,
    initialContext: {
      stakeholderName: 'Acme Corporation',
      requestedAmount: 50000
    }
  })
})

const { instance, workToken } = await response.json()

// Later: Complete task
await fetch(`/api/workflows/instances/${instance.id}/task-complete`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workTokenId: workToken.id,
    outputData: {
      verified: true,
      completedAt: new Date().toISOString()
    }
  })
})
```

## Key Design Decisions

### 1. Current Node as Single Source of Truth

The `current_node_id` field in `workflow_engine_instances` is the authoritative state indicator. All transitions update this field atomically.

### 2. Recursion Guard

Gateway node chains are evaluated recursively with protection against:
- Infinite loops (cycle detection)
- Maximum depth exceeded (default: 100 nodes)

### 3. Context Scoping

- **GLOBAL**: Available throughout workflow, persisted across tasks
- **TASK_LOCAL**: Scoped to individual task, merged on completion
- **NODE_LOCAL**: Temporary evaluation data (not persisted)

### 4. Registry-Based Decoupling

Task nodes reference `function_code`, which is looked up in the registry. This allows:
- Changing implementation (USER_TASK → AI_AGENT_TASK) without modifying workflow definitions
- Versioning of task implementations
- Reusable task functions across workflows

### 5. Application-Level Rollback

For Sprint 1d.3, transactions use application-level rollback. Migration path to PostgreSQL stored procedures is documented for production hardening.

## Error Handling

All workflow errors extend `WorkflowError`:

```typescript
try {
  await executor.execute(instance, definition)
} catch (error) {
  if (error instanceof WorkflowError) {
    console.log(error.type)           // 'REGISTRY_FUNCTION_NOT_FOUND'
    console.log(error.getUserMessage()) // User-friendly message
    console.log(error.recoverable)     // Can retry?
    console.log(error.details)         // Debug info
  }
}
```

## Multi-Tenancy

All operations enforce multi-tenancy via `app_uuid`:
- Database queries filtered by `app_uuid`
- RLS policies at database level
- No cross-app data leakage

## Testing

### Test Scenarios

1. **Linear Workflow**: 3 sequential tasks
2. **Conditional Branching**: Gateway with 2 paths
3. **Context Data Flow**: Verify data passes through tasks
4. **Registry Lookup**: Correct function retrieval
5. **Multi-Tenancy**: App isolation
6. **Error Handling**: Missing registry, invalid conditions

## Future Enhancements

- **INCLUSIVE/PARALLEL Gateways**: Multi-path execution
- **Workflow Definition Validation**: Graph traversal, cycle detection
- **PostgreSQL Transactions**: Stored procedures for atomic operations
- **Output Schema Validation**: JSON Schema validation on task completion
- **Workflow Versioning**: Support multiple active versions
- **Sub-workflows**: Nested workflow execution
- **Timer Events**: Scheduled node activation
- **Error Boundary Nodes**: Catch and handle errors gracefully

## Related Documentation

- Sprint Specification: `docs/` (Sprint 1d.3)
- Database Migration: `supabase/migrations/20251119_create_workflow_engine_tables.sql`
- Architecture Proposal: See project kickoff instructions

## Authors

- Sprint 1d.3 Implementation
- Date: November 2025
