/**
 * Sprint 1d.4: Pre-built Function Templates
 * Library of common workflow function templates for rapid creation
 */

import type { FunctionTemplate } from './template-types';

export const FUNCTION_TEMPLATES: FunctionTemplate[] = [
  // Template 1: Approve Document
  {
    id: 'approve_document',
    name: 'Approve Document',
    description: 'User reviews and approves or rejects a document with feedback',
    icon: '📄',
    implementationType: 'USER_TASK',
    category: 'approval',
    defaultFunctionCode: 'approve_document',
    exampleUseCases: [
      'Contract approval workflow',
      'Tender review process',
      'Policy document sign-off',
    ],
    uiWidgetId: 'TextArea',
    inputSchema: {
      type: 'object',
      properties: {
        documentName: {
          type: 'string',
          description: 'Name of the document to review',
        },
        documentContent: {
          type: 'string',
          description: 'Document content or summary',
        },
        reviewDeadline: {
          type: 'string',
          format: 'date',
          description: 'Deadline for review',
        },
      },
      required: ['documentName', 'documentContent'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        approved: {
          type: 'boolean',
          description: 'Approval decision (true = approved, false = rejected)',
        },
        feedback: {
          type: 'string',
          description: 'Reviewer feedback and comments',
        },
        approvalDate: {
          type: 'string',
          format: 'date-time',
          description: 'When the approval decision was made',
        },
      },
      required: ['approved'],
    },
  },

  // Template 2: Gather Information
  {
    id: 'gather_information',
    name: 'Gather Information',
    description: 'Collect structured information from user via text input',
    icon: '📝',
    implementationType: 'USER_TASK',
    category: 'gathering',
    defaultFunctionCode: 'gather_information',
    exampleUseCases: [
      'Collect stakeholder contact details',
      'Gather project requirements',
      'Request additional documentation',
    ],
    uiWidgetId: 'TextInput',
    inputSchema: {
      type: 'object',
      properties: {
        fieldLabel: {
          type: 'string',
          description: 'What information is needed from the user',
        },
        helpText: {
          type: 'string',
          description: 'Guidance or instructions for the user',
        },
      },
      required: ['fieldLabel'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        information: {
          type: 'string',
          description: 'The information collected from the user',
        },
        submittedDate: {
          type: 'string',
          format: 'date-time',
          description: 'When the information was submitted',
        },
      },
      required: ['information'],
    },
  },

  // Template 3: Review and Validate Data
  {
    id: 'review_validate_data',
    name: 'Review and Validate Data',
    description: 'Review data for correctness and completeness with validation notes',
    icon: '✅',
    implementationType: 'USER_TASK',
    category: 'validation',
    defaultFunctionCode: 'review_validate_data',
    exampleUseCases: [
      'Data quality check',
      'Financial statement validation',
      'Compliance review',
    ],
    uiWidgetId: 'TextArea',
    inputSchema: {
      type: 'object',
      properties: {
        dataToReview: {
          type: 'string',
          description: 'The data that needs to be reviewed',
        },
        validationCriteria: {
          type: 'string',
          description: 'Criteria to validate against',
        },
      },
      required: ['dataToReview'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        isValid: {
          type: 'boolean',
          description: 'Is the data valid?',
        },
        validationNotes: {
          type: 'string',
          description: 'Notes about the validation process',
        },
        issues: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'List of any issues found',
        },
      },
      required: ['isValid'],
    },
  },

  // Template 4: Make Decision
  {
    id: 'make_decision',
    name: 'Make Decision',
    description: 'User makes a choice from predefined options with reasoning',
    icon: '🤔',
    implementationType: 'USER_TASK',
    category: 'decision',
    defaultFunctionCode: 'make_decision',
    exampleUseCases: [
      'Choose procurement vendor',
      'Select project methodology',
      'Prioritize feature requests',
    ],
    uiWidgetId: 'SelectField',
    inputSchema: {
      type: 'object',
      properties: {
        decisionPrompt: {
          type: 'string',
          description: 'What decision needs to be made',
        },
        options: {
          type: 'string',
          description: 'Available options (comma-separated)',
        },
      },
      required: ['decisionPrompt', 'options'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        chosenOption: {
          type: 'string',
          description: 'The option that was selected',
        },
        reasoning: {
          type: 'string',
          description: 'Explanation of why this option was chosen',
        },
      },
      required: ['chosenOption'],
    },
  },

  // Template 5: Confirm Submission
  {
    id: 'confirm_submission',
    name: 'Confirm Submission',
    description: 'Final confirmation step before proceeding with an action',
    icon: '✓',
    implementationType: 'USER_TASK',
    category: 'confirmation',
    defaultFunctionCode: 'confirm_submission',
    exampleUseCases: [
      'Confirm payment submission',
      'Finalize contract terms',
      'Sign-off on deliverables',
    ],
    uiWidgetId: 'TextInput',
    inputSchema: {
      type: 'object',
      properties: {
        confirmationMessage: {
          type: 'string',
          description: 'Message explaining what is being confirmed',
        },
        requiresSignoff: {
          type: 'boolean',
          description: 'Does this require formal sign-off?',
        },
      },
      required: ['confirmationMessage'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        confirmed: {
          type: 'boolean',
          description: 'User confirmation (true = confirmed)',
        },
        confirmedBy: {
          type: 'string',
          description: 'Name or identifier of person confirming',
        },
        confirmationTime: {
          type: 'string',
          format: 'date-time',
          description: 'When the confirmation was made',
        },
      },
      required: ['confirmed'],
    },
  },
];

// Helper function to get template by ID
export function getTemplateById(id: string): FunctionTemplate | undefined {
  return FUNCTION_TEMPLATES.find((template) => template.id === id);
}

// Helper function to get templates by category
export function getTemplatesByCategory(category: string): FunctionTemplate[] {
  return FUNCTION_TEMPLATES.filter((template) => template.category === category);
}
