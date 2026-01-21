// ============================================
// TypeScript Types for Supabase Project: omcwrxgevcvatmszphba
// Generated: 2025-01-30
// ============================================
// 
// This file contains TypeScript type definitions for the Supabase database.
// Use this with @supabase/supabase-js for type-safe database access.
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      address: {
        Row: {
          country_code: string
          created_at: string | null
          full_address: Json
          id: string
          is_primary: boolean | null
          location_type_id: string
          stakeholder_id: string
          updated_at: string | null
          what3words: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          full_address: Json
          id?: string
          is_primary?: boolean | null
          location_type_id: string
          stakeholder_id: string
          updated_at?: string | null
          what3words?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          full_address?: Json
          id?: string
          is_primary?: boolean | null
          location_type_id?: string
          stakeholder_id?: string
          updated_at?: string | null
          what3words?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "address_location_type_id_fkey"
            columns: ["location_type_id"]
            isOneToOne: false
            referencedRelation: "location_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "address_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholder"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          entity_reference: string | null
          entity_type: string
          error_message: string | null
          id: string
          ip_address: unknown
          status: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_reference?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_reference?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_info: {
        Row: {
          contact_type: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          is_public: boolean | null
          label: string | null
          stakeholder_id: string
          updated_at: string | null
          value: string
        }
        Insert: {
          contact_type: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_public?: boolean | null
          label?: string | null
          stakeholder_id: string
          updated_at?: string | null
          value: string
        }
        Update: {
          contact_type?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_public?: boolean | null
          label?: string | null
          stakeholder_id?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_info_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholder"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_pathways: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          name: string
          steps: Json
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          name: string
          steps?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          name?: string
          steps?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      holding_table_templates: {
        Row: {
          column_definitions: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          mapping_rules: Json | null
          reference: string
          template_code: string
          template_name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          column_definitions: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          mapping_rules?: Json | null
          reference?: string
          template_code: string
          template_name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          column_definitions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          mapping_rules?: Json | null
          reference?: string
          template_code?: string
          template_name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "holding_table_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      holding_tables: {
        Row: {
          approved_count: number | null
          created_at: string | null
          error_count: number | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          notes: string | null
          physical_table_name: string
          processed_count: number | null
          record_count: number | null
          reference: string
          rejected_count: number | null
          status: string | null
          table_name: string
          template_id: string | null
          updated_at: string | null
          upload_date: string | null
          uploaded_by: string | null
        }
        Insert: {
          approved_count?: number | null
          created_at?: string | null
          error_count?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          notes?: string | null
          physical_table_name: string
          processed_count?: number | null
          record_count?: number | null
          reference?: string
          rejected_count?: number | null
          status?: string | null
          table_name: string
          template_id?: string | null
          updated_at?: string | null
          upload_date?: string | null
          uploaded_by?: string | null
        }
        Update: {
          approved_count?: number | null
          created_at?: string | null
          error_count?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          notes?: string | null
          physical_table_name?: string
          processed_count?: number | null
          record_count?: number | null
          reference?: string
          rejected_count?: number | null
          status?: string | null
          table_name?: string
          template_id?: string | null
          updated_at?: string | null
          upload_date?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holding_tables_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "holding_table_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holding_tables_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      individual: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          gender_identity: string | null
          id: string
          name: Json
          profile_picture_url: string | null
          pronoun: string | null
          sex_assigned_at_birth: string | null
          stakeholder_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          gender_identity?: string | null
          id?: string
          name: Json
          profile_picture_url?: string | null
          pronoun?: string | null
          sex_assigned_at_birth?: string | null
          stakeholder_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          gender_identity?: string | null
          id?: string
          name?: Json
          profile_picture_url?: string | null
          pronoun?: string | null
          sex_assigned_at_birth?: string | null
          stakeholder_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "individual_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: true
            referencedRelation: "stakeholder"
            referencedColumns: ["id"]
          },
        ]
      }
      industry: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          division: string | null
          group_code: string | null
          id: string
          is_active: boolean | null
          name: string
          section: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          division?: string | null
          group_code?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          section?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          division?: string | null
          group_code?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          section?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      llm_interfaces: {
        Row: {
          api_key_enc: string
          base_url: string | null
          code: string
          context_window_tokens: number | null
          created_at: string | null
          default_model: string
          description: string | null
          health_status: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_health_check: string | null
          max_tokens: number | null
          metadata: Json | null
          name: string
          provider: string
          supports_json: boolean | null
          supports_tools: boolean | null
          supports_vision: boolean | null
          temperature: number | null
          top_p: number | null
          total_cost: number | null
          total_requests: number | null
          total_tokens_used: number | null
          updated_at: string | null
        }
        Insert: {
          api_key_enc: string
          base_url?: string | null
          code: string
          context_window_tokens?: number | null
          created_at?: string | null
          default_model: string
          description?: string | null
          health_status?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_health_check?: string | null
          max_tokens?: number | null
          metadata?: Json | null
          name: string
          provider?: string
          supports_json?: boolean | null
          supports_tools?: boolean | null
          supports_vision?: boolean | null
          temperature?: number | null
          top_p?: number | null
          total_cost?: number | null
          total_requests?: number | null
          total_tokens_used?: number | null
          updated_at?: string | null
        }
        Update: {
          api_key_enc?: string
          base_url?: string | null
          code?: string
          context_window_tokens?: number | null
          created_at?: string | null
          default_model?: string
          description?: string | null
          health_status?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_health_check?: string | null
          max_tokens?: number | null
          metadata?: Json | null
          name?: string
          provider?: string
          supports_json?: boolean | null
          supports_tools?: boolean | null
          supports_vision?: boolean | null
          temperature?: number | null
          top_p?: number | null
          total_cost?: number | null
          total_requests?: number | null
          total_tokens_used?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      location_type: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      organisation: {
        Row: {
          created_at: string | null
          id: string
          industry_id: string | null
          logo_url: string | null
          metadata: Json | null
          organisation_name: string
          organisation_size: number | null
          organisation_type_id: string | null
          stakeholder_id: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry_id?: string | null
          logo_url?: string | null
          metadata?: Json | null
          organisation_name: string
          organisation_size?: number | null
          organisation_type_id?: string | null
          stakeholder_id: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry_id?: string | null
          logo_url?: string | null
          metadata?: Json | null
          organisation_name?: string
          organisation_size?: number | null
          organisation_type_id?: string | null
          stakeholder_id?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisation_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_organisation_type_id_fkey"
            columns: ["organisation_type_id"]
            isOneToOne: false
            referencedRelation: "organisation_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: true
            referencedRelation: "stakeholder"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_type: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      prompt_executions: {
        Row: {
          completed_at: string | null
          cost_estimate: number | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json
          llm_interface_id: string | null
          max_tokens: number | null
          model_used: string | null
          output_data: Json | null
          prompt_template_id: string | null
          raw_response: string | null
          rendered_prompt: string | null
          stakeholder_id: string | null
          started_at: string | null
          status: string | null
          temperature: number | null
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data: Json
          llm_interface_id?: string | null
          max_tokens?: number | null
          model_used?: string | null
          output_data?: Json | null
          prompt_template_id?: string | null
          raw_response?: string | null
          rendered_prompt?: string | null
          stakeholder_id?: string | null
          started_at?: string | null
          status?: string | null
          temperature?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json
          llm_interface_id?: string | null
          max_tokens?: number | null
          model_used?: string | null
          output_data?: Json | null
          prompt_template_id?: string | null
          raw_response?: string | null
          rendered_prompt?: string | null
          stakeholder_id?: string | null
          started_at?: string | null
          status?: string | null
          temperature?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_executions_llm_interface_id_fkey"
            columns: ["llm_interface_id"]
            isOneToOne: false
            referencedRelation: "llm_interfaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_executions_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_executions_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "t_stakeholder"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          default_llm_interface_id: string | null
          default_model: string | null
          description: string | null
          id: string
          input_schema: Json | null
          is_active: boolean | null
          max_tokens: number | null
          output_format: string | null
          output_schema: Json | null
          prompt_code: string
          prompt_name: string
          system_prompt: string | null
          temperature: number | null
          updated_at: string | null
          user_prompt_template: string
          version: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          default_llm_interface_id?: string | null
          default_model?: string | null
          description?: string | null
          id?: string
          input_schema?: Json | null
          is_active?: boolean | null
          max_tokens?: number | null
          output_format?: string | null
          output_schema?: Json | null
          prompt_code: string
          prompt_name: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
          user_prompt_template: string
          version?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          default_llm_interface_id?: string | null
          default_model?: string | null
          description?: string | null
          id?: string
          input_schema?: Json | null
          is_active?: boolean | null
          max_tokens?: number | null
          output_format?: string | null
          output_schema?: Json | null
          prompt_code?: string
          prompt_name?: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
          user_prompt_template?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_templates_default_llm_interface_id_fkey"
            columns: ["default_llm_interface_id"]
            isOneToOne: false
            referencedRelation: "llm_interfaces"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          metadata: Json | null
          reference: string
          relationship_type: string
          role_a_id: string | null
          role_b_id: string | null
          stakeholder_a_id: string
          stakeholder_b_id: string
          start_date: string | null
          status: string
          strength: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          reference?: string
          relationship_type: string
          role_a_id?: string | null
          role_b_id?: string | null
          stakeholder_a_id: string
          stakeholder_b_id: string
          start_date?: string | null
          status?: string
          strength?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          reference?: string
          relationship_type?: string
          role_a_id?: string | null
          role_b_id?: string | null
          stakeholder_a_id?: string
          stakeholder_b_id?: string
          start_date?: string | null
          status?: string
          strength?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationship_role_a_id_fkey"
            columns: ["role_a_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_role_b_id_fkey"
            columns: ["role_b_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_stakeholder_a_id_fkey"
            columns: ["stakeholder_a_id"]
            isOneToOne: false
            referencedRelation: "stakeholder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_stakeholder_b_id_fkey"
            columns: ["stakeholder_b_id"]
            isOneToOne: false
            referencedRelation: "stakeholder"
            referencedColumns: ["id"]
          },
        ]
      }
      role: {
        Row: {
          app_uuid: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          rules: Json | null
          stakeholder_type: string
          updated_at: string | null
        }
        Insert: {
          app_uuid: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rules?: Json | null
          stakeholder_type: string
          updated_at?: string | null
        }
        Update: {
          app_uuid?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rules?: Json | null
          stakeholder_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sic_code: {
        Row: {
          code: string
          created_at: string | null
          description: string
          division: string | null
          id: string
          is_active: boolean | null
          section: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          division?: string | null
          id?: string
          is_active?: boolean | null
          section?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          division?: string | null
          id?: string
          is_active?: boolean | null
          section?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stakeholder: {
        Row: {
          additional_data: Json | null
          country_code: string | null
          created_at: string | null
          created_by: string | null
          discovery_metadata: Json | null
          id: string
          notes: string | null
          reference: string
          stakeholder_name: string
          stakeholder_type: string
          status: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          additional_data?: Json | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          discovery_metadata?: Json | null
          id?: string
          notes?: string | null
          reference?: string
          stakeholder_name: string
          stakeholder_type: string
          status?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          additional_data?: Json | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          discovery_metadata?: Json | null
          id?: string
          notes?: string | null
          reference?: string
          stakeholder_name?: string
          stakeholder_type?: string
          status?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      t_stakeholder: {
        Row: {
          additional_data: Json | null
          company_number: string | null
          country_code: string | null
          created_at: string | null
          created_by: string | null
          current_state: string | null
          email_address: string | null
          enrichment_completed_at: string | null
          enrichment_data: Json | null
          enrichment_error: string | null
          enrichment_pathway_id: string | null
          enrichment_started_at: string | null
          enrichment_status: string | null
          entity_name: string
          entity_type: string
          id: string
          linkedin_url: string | null
          reference: string
          source_holding_table_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          additional_data?: Json | null
          company_number?: string | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          current_state?: string | null
          email_address?: string | null
          enrichment_completed_at?: string | null
          enrichment_data?: Json | null
          enrichment_error?: string | null
          enrichment_pathway_id?: string | null
          enrichment_started_at?: string | null
          enrichment_status?: string | null
          entity_name: string
          entity_type: string
          id?: string
          linkedin_url?: string | null
          reference?: string
          source_holding_table_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          additional_data?: Json | null
          company_number?: string | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          current_state?: string | null
          email_address?: string | null
          enrichment_completed_at?: string | null
          enrichment_data?: Json | null
          enrichment_error?: string | null
          enrichment_pathway_id?: string | null
          enrichment_started_at?: string | null
          enrichment_status?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          linkedin_url?: string | null
          reference?: string
          source_holding_table_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_source_holding_table"
            columns: ["source_holding_table_id"]
            isOneToOne: false
            referencedRelation: "holding_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "t_stakeholder_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "t_stakeholder_enrichment_pathway_id_fkey"
            columns: ["enrichment_pathway_id"]
            isOneToOne: false
            referencedRelation: "enrichment_pathways"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          display_name: string
          email: string
          id: string
          is_active: boolean | null
          role: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          display_name: string
          email: string
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      relationship_with_roles: {
        Row: {
          end_date: string | null
          id: string | null
          reference: string | null
          relationship_type: string | null
          role_a_id: string | null
          role_a_name: string | null
          role_b_id: string | null
          role_b_name: string | null
          stakeholder_a_id: string | null
          stakeholder_a_name: string | null
          stakeholder_b_id: string | null
          stakeholder_b_name: string | null
          start_date: string | null
          status: string | null
          strength: number | null
        }
        Relationships: []
      }
      stakeholder_full: {
        Row: {
          country_code: string | null
          created_at: string | null
          date_of_birth: string | null
          display_name: string | null
          gender_identity: string | null
          id: string | null
          individual_name: Json | null
          industry_id: string | null
          industry_name: string | null
          organisation_size: number | null
          organisation_type_id: string | null
          organisation_type_name: string | null
          pronoun: string | null
          reference: string | null
          stakeholder_name: string | null
          stakeholder_type: string | null
          status: string | null
          updated_at: string | null
          website: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      exec_sql: { Args: { sql: string }; Returns: undefined }
      is_admin_user: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const















