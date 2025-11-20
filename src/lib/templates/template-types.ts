/**
 * Sprint 1d.4: Function Template Types
 * Type definitions for pre-built function templates
 */

import type { JSONSchema, ImplementationType } from '@/lib/types/function-registry';

export type TemplateCategory = 'approval' | 'gathering' | 'validation' | 'decision' | 'confirmation';

export interface FunctionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon
  implementationType: ImplementationType;
  category: TemplateCategory;

  // Pre-populated schemas
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  uiWidgetId: string;

  // Default values for function creation
  defaultFunctionCode: string;
  exampleUseCases: string[];
}
