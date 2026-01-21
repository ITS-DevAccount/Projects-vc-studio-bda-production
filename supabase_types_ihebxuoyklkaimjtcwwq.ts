export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Note: Full type definitions are available from Supabase MCP
  // Use mcp_supabase_generate_typescript_types to get complete types
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: Record<string, any>
    Views: Record<string, any>
    Functions: Record<string, any>
    Enums: {
      llm_provider: "anthropic" | "openai" | "deepseek" | "gemini"
    }
  }
}

// For complete type definitions, regenerate using:
// mcp_supabase_generate_typescript_types
