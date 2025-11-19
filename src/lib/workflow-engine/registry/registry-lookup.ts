/**
 * Registry Lookup
 *
 * Looks up function implementations from the function registry
 * Decouples workflow definitions from task implementations
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { FunctionRegistryEntry } from '../types'
import { createRegistryFunctionNotFoundError, WorkflowError } from '../types/errors'

// ============================================================================
// Registry Lookup Class
// ============================================================================

export class RegistryLookup {
  private supabase: SupabaseClient
  private appUuid: string

  constructor(supabase: SupabaseClient, appUuid: string) {
    this.supabase = supabase
    this.appUuid = appUuid
  }

  /**
   * Look up a function in the registry
   *
   * @param functionCode - Function code to look up
   * @returns Registry entry with full implementation details
   * @throws WorkflowError if function not found
   */
  async lookupFunction(functionCode: string): Promise<FunctionRegistryEntry> {
    const { data, error } = await this.supabase
      .from('function_registry')
      .select('*')
      .eq('function_code', functionCode)
      .eq('app_uuid', this.appUuid)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      throw createRegistryFunctionNotFoundError(functionCode, this.appUuid)
    }

    return this.mapDatabaseRowToEntry(data)
  }

  /**
   * Look up multiple functions (batch)
   */
  async lookupFunctions(
    functionCodes: string[]
  ): Promise<Map<string, FunctionRegistryEntry>> {
    if (functionCodes.length === 0) {
      return new Map()
    }

    const { data, error } = await this.supabase
      .from('function_registry')
      .select('*')
      .in('function_code', functionCodes)
      .eq('app_uuid', this.appUuid)
      .eq('is_active', true)
      .order('function_code')
      .order('version', { ascending: false })

    if (error) {
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'lookupFunctions', error: error.message },
        false,
        `Failed to lookup functions: ${error.message}`
      )
    }

    // Group by function_code and take highest version
    const result = new Map<string, FunctionRegistryEntry>()
    const seen = new Set<string>()

    for (const row of data || []) {
      if (!seen.has(row.function_code)) {
        result.set(row.function_code, this.mapDatabaseRowToEntry(row))
        seen.add(row.function_code)
      }
    }

    // Check for missing functions
    const missing = functionCodes.filter(code => !result.has(code))
    if (missing.length > 0) {
      throw new WorkflowError(
        'REGISTRY_FUNCTION_NOT_FOUND',
        { functionCodes: missing, appUuid: this.appUuid },
        false,
        `Functions not found in registry: ${missing.join(', ')}`
      )
    }

    return result
  }

  /**
   * List all available functions (for UI/debugging)
   */
  async listFunctions(): Promise<FunctionRegistryEntry[]> {
    const { data, error } = await this.supabase
      .from('function_registry')
      .select('*')
      .eq('app_uuid', this.appUuid)
      .eq('is_active', true)
      .order('function_code')
      .order('version', { ascending: false })

    if (error) {
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'listFunctions', error: error.message },
        false,
        `Failed to list functions: ${error.message}`
      )
    }

    // Group by function_code and take highest version
    const result: FunctionRegistryEntry[] = []
    const seen = new Set<string>()

    for (const row of data || []) {
      if (!seen.has(row.function_code)) {
        result.push(this.mapDatabaseRowToEntry(row))
        seen.add(row.function_code)
      }
    }

    return result
  }

  /**
   * Map database row to FunctionRegistryEntry type
   */
  private mapDatabaseRowToEntry(row: any): FunctionRegistryEntry {
    return {
      id: row.id,
      functionCode: row.function_code,
      functionName: row.function_name,
      description: row.description,
      implementationType: row.implementation_type,
      inputSchema: row.input_schema,
      outputSchema: row.output_schema,
      config: row.config,
      version: row.version,
      isActive: row.is_active,
      appUuid: row.app_uuid,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      updatedAt: new Date(row.updated_at),
      updatedBy: row.updated_by,
    }
  }
}
