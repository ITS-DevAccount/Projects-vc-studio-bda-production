// Sprint 1d.7: FLM Building Workflow - Schema Validator
// Phase A: AI Interface Foundation

import Ajv from 'ajv';
import { ValidationResult } from './types';

export class SchemaValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false
    });
  }

  /**
   * Validate JSON data against schema
   */
  validate(data: any, schema: object): ValidationResult {
    try {
      const validate = this.ajv.compile(schema);
      const valid = validate(data);

      if (valid) {
        return {
          valid: true,
          data
        };
      }

      const errors = validate.errors?.map(err => {
        const path = err.instancePath || 'root';
        return `${path}: ${err.message}`;
      }) || [];

      return {
        valid: false,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Extract JSON from LLM response (handles markdown code blocks)
   */
  extractJson(response: string): any {
    let cleaned = response.trim();

    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/, '');
    cleaned = cleaned.replace(/\s*```$/, '');

    // Find JSON object or array
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      cleaned = jsonMatch[1];
    }

    // Try to parse
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      // Attempt repair
      const repaired = this.repairJson(cleaned);
      return JSON.parse(repaired);
    }
  }

  /**
   * Repair common JSON issues from LLM output
   */
  repairJson(malformedJson: string): string {
    let repaired = malformedJson;

    // Fix trailing commas
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    // Fix missing quotes around keys
    repaired = repaired.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

    // Fix single quotes to double quotes
    repaired = repaired.replace(/'/g, '"');

    // Remove comments (// and /* */)
    repaired = repaired.replace(/\/\/.*/g, '');
    repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '');

    // Fix missing closing brackets (basic attempt)
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      repaired += '}'.repeat(openBraces - closeBraces);
    }

    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      repaired += ']'.repeat(openBrackets - closeBrackets);
    }

    return repaired;
  }

  /**
   * Validate and extract JSON from LLM response
   */
  validateResponse(response: string, schema: object): ValidationResult {
    try {
      const data = this.extractJson(response);
      return this.validate(data, schema);
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to extract JSON: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}

// Singleton instance
let validatorInstance: SchemaValidator | null = null;

export function getSchemaValidator(): SchemaValidator {
  if (!validatorInstance) {
    validatorInstance = new SchemaValidator();
  }
  return validatorInstance;
}
