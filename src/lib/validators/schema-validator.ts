/**
 * Sprint 1d.4: JSON Schema Validator
 * Validates data against JSON Schema (simplified implementation)
 * TODO: Install and use ajv (Another JSON Validator) for production
 */

import type { JSONSchema, JSONSchemaProperty } from '@/lib/types/function-registry';
import type { ValidationError, ValidationResult } from '@/lib/types/function-registry';

/**
 * Validate a single field value against its schema property
 */
function validateField(
  fieldName: string,
  value: any,
  schema: JSONSchemaProperty,
  isRequired: boolean
): ValidationError | null {
  // Check required
  if (isRequired && (value === null || value === undefined || value === '')) {
    return {
      field: fieldName,
      message: `Field '${fieldName}' is required`,
    };
  }

  // If not required and empty, skip other validations
  if (!isRequired && (value === null || value === undefined || value === '')) {
    return null;
  }

  // Type validation
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be a string`,
        };
      }

      // Min/max length
      if (schema.minLength && value.length < schema.minLength) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be at least ${schema.minLength} characters`,
        };
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be at most ${schema.maxLength} characters`,
        };
      }

      // Pattern
      if (schema.pattern) {
        try {
          const regex = new RegExp(schema.pattern);
          if (!regex.test(value)) {
            return {
              field: fieldName,
              message: `Field '${fieldName}' does not match required pattern`,
            };
          }
        } catch (e) {
          console.error('Invalid regex pattern:', schema.pattern);
        }
      }

      // Format validation
      if (schema.format) {
        const formatError = validateFormat(fieldName, value, schema.format);
        if (formatError) return formatError;
      }

      // Enum
      if (schema.enum && !schema.enum.includes(value)) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be one of: ${schema.enum.join(', ')}`,
        };
      }
      break;

    case 'number':
    case 'integer':
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (typeof numValue !== 'number' || isNaN(numValue)) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be a number`,
        };
      }

      if (schema.type === 'integer' && !Number.isInteger(numValue)) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be an integer`,
        };
      }

      // Min/max
      if (schema.minimum !== undefined && numValue < schema.minimum) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be at least ${schema.minimum}`,
        };
      }
      if (schema.maximum !== undefined && numValue > schema.maximum) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be at most ${schema.maximum}`,
        };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be a boolean`,
        };
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be an array`,
        };
      }
      // TODO: Validate array items against schema.items
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be an object`,
        };
      }
      // TODO: Validate nested object properties
      break;
  }

  return null;
}

/**
 * Validate format strings (email, url, date, etc.)
 */
function validateFormat(fieldName: string, value: string, format: string): ValidationError | null {
  switch (format) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be a valid email address`,
        };
      }
      break;

    case 'url':
    case 'uri':
      try {
        new URL(value);
      } catch (e) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be a valid URL`,
        };
      }
      break;

    case 'date':
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be a valid date (YYYY-MM-DD)`,
        };
      }
      break;

    case 'date-time':
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (e) {
        return {
          field: fieldName,
          message: `Field '${fieldName}' must be a valid date-time`,
        };
      }
      break;
  }

  return null;
}

/**
 * Validate entire data object against JSON Schema
 */
export function validateAgainstSchema(data: Record<string, any>, schema: JSONSchema): ValidationResult {
  const errors: ValidationError[] = [];

  // Get required fields
  const required = schema.required || [];

  // Validate each property
  for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
    const isRequired = required.includes(fieldName);
    const value = data[fieldName];

    const error = validateField(fieldName, value, fieldSchema, isRequired);
    if (error) {
      errors.push(error);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate JSON Schema itself (check if schema is valid)
 */
export function isValidJSONSchema(schema: any): boolean {
  if (!schema || typeof schema !== 'object') return false;
  if (schema.type !== 'object') return false;
  if (!schema.properties || typeof schema.properties !== 'object') return false;

  // Check each property has a valid type
  for (const [_key, prop] of Object.entries(schema.properties)) {
    if (typeof prop !== 'object' || !(prop as any).type) {
      return false;
    }

    const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
    if (!validTypes.includes((prop as any).type)) {
      return false;
    }
  }

  return true;
}

/**
 * Client-side real-time field validation (for form inputs)
 */
export function validateFieldRealtime(
  fieldName: string,
  value: any,
  schema: JSONSchemaProperty,
  isRequired: boolean
): string | null {
  const error = validateField(fieldName, value, schema, isRequired);
  return error ? error.message : null;
}
