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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      collection_runs: {
        Row: {
          created_at: string
          duplicate_item_count: number
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          generated_evidence_count: number
          http_status: number | null
          id: string
          log_excerpt: string | null
          raw_item_count: number
          redirect_url: string | null
          response_time_ms: number | null
          run_type: Database["public"]["Enums"]["run_type"]
          source_id: string
          started_at: string
          status: Database["public"]["Enums"]["run_status"]
          triggered_by: string | null
          valid_item_count: number
        }
        Insert: {
          created_at?: string
          duplicate_item_count?: number
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          generated_evidence_count?: number
          http_status?: number | null
          id?: string
          log_excerpt?: string | null
          raw_item_count?: number
          redirect_url?: string | null
          response_time_ms?: number | null
          run_type?: Database["public"]["Enums"]["run_type"]
          source_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          triggered_by?: string | null
          valid_item_count?: number
        }
        Update: {
          created_at?: string
          duplicate_item_count?: number
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          generated_evidence_count?: number
          http_status?: number | null
          id?: string
          log_excerpt?: string | null
          raw_item_count?: number
          redirect_url?: string | null
          response_time_ms?: number | null
          run_type?: Database["public"]["Enums"]["run_type"]
          source_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          triggered_by?: string | null
          valid_item_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      event_evidence: {
        Row: {
          added_at: string
          added_by: string | null
          event_id: string
          evidence_id: string
          evidence_role: string | null
          relation_type: Database["public"]["Enums"]["relation_type"]
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          event_id: string
          evidence_id: string
          evidence_role?: string | null
          relation_type?: Database["public"]["Enums"]["relation_type"]
        }
        Update: {
          added_at?: string
          added_by?: string | null
          event_id?: string
          evidence_id?: string
          evidence_role?: string | null
          relation_type?: Database["public"]["Enums"]["relation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "event_evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "intelligence_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_evidence_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_items"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_items: {
        Row: {
          author: string | null
          can_be_policy_evidence: boolean
          canonical_url: string | null
          captured_by: string | null
          collected_at: string
          content_hash: string | null
          content_text: string | null
          created_at: string
          data_origin: Database["public"]["Enums"]["data_origin"]
          effective_at: string | null
          expires_at: string | null
          id: string
          last_verified_at: string | null
          online_access_status: string | null
          original_language: string | null
          published_at: string | null
          requires_login: boolean
          source_id: string
          title: string
          updated_at: string
          verification_reason: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          author?: string | null
          can_be_policy_evidence?: boolean
          canonical_url?: string | null
          captured_by?: string | null
          collected_at?: string
          content_hash?: string | null
          content_text?: string | null
          created_at?: string
          data_origin?: Database["public"]["Enums"]["data_origin"]
          effective_at?: string | null
          expires_at?: string | null
          id?: string
          last_verified_at?: string | null
          online_access_status?: string | null
          original_language?: string | null
          published_at?: string | null
          requires_login?: boolean
          source_id: string
          title: string
          updated_at?: string
          verification_reason?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          author?: string | null
          can_be_policy_evidence?: boolean
          canonical_url?: string | null
          captured_by?: string | null
          collected_at?: string
          content_hash?: string | null
          content_text?: string | null
          created_at?: string
          data_origin?: Database["public"]["Enums"]["data_origin"]
          effective_at?: string | null
          expires_at?: string | null
          id?: string
          last_verified_at?: string | null
          online_access_status?: string | null
          original_language?: string | null
          published_at?: string | null
          requires_login?: boolean
          source_id?: string
          title?: string
          updated_at?: string
          verification_reason?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_versions: {
        Row: {
          attachment_storage_path: string | null
          collected_at: string
          content_hash: string | null
          content_text: string | null
          created_at: string
          created_by: string | null
          evidence_id: string
          html_storage_path: string | null
          id: string
          metadata_json: Json | null
          screenshot_storage_path: string | null
          version_number: number
        }
        Insert: {
          attachment_storage_path?: string | null
          collected_at?: string
          content_hash?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          evidence_id: string
          html_storage_path?: string | null
          id?: string
          metadata_json?: Json | null
          screenshot_storage_path?: string | null
          version_number: number
        }
        Update: {
          attachment_storage_path?: string | null
          collected_at?: string
          content_hash?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          evidence_id?: string
          html_storage_path?: string | null
          id?: string
          metadata_json?: Json | null
          screenshot_storage_path?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "evidence_versions_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_items"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_events: {
        Row: {
          affected_users: string | null
          created_at: string
          data_origin: Database["public"]["Enums"]["data_origin"]
          effective_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          first_detected_at: string
          id: string
          last_updated_at: string
          owner: string | null
          published_time_end: string | null
          published_time_start: string | null
          recommended_actions: string[] | null
          review_note: string | null
          reviewed_at: string | null
          reviewer: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          summary: string | null
          title: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          workflow_status: Database["public"]["Enums"]["workflow_status"]
        }
        Insert: {
          affected_users?: string | null
          created_at?: string
          data_origin?: Database["public"]["Enums"]["data_origin"]
          effective_at?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          first_detected_at?: string
          id?: string
          last_updated_at?: string
          owner?: string | null
          published_time_end?: string | null
          published_time_start?: string | null
          recommended_actions?: string[] | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewer?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          summary?: string | null
          title: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          workflow_status?: Database["public"]["Enums"]["workflow_status"]
        }
        Update: {
          affected_users?: string | null
          created_at?: string
          data_origin?: Database["public"]["Enums"]["data_origin"]
          effective_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          first_detected_at?: string
          id?: string
          last_updated_at?: string
          owner?: string | null
          published_time_end?: string | null
          published_time_start?: string | null
          recommended_actions?: string[] | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewer?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          summary?: string | null
          title?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          workflow_status?: Database["public"]["Enums"]["workflow_status"]
        }
        Relationships: []
      }
      product_impacts: {
        Row: {
          created_at: string
          event_id: string
          id: string
          impact_level: Database["public"]["Enums"]["impact_level"]
          impact_reason: string | null
          owner: string | null
          product_module: Database["public"]["Enums"]["product_module"]
          status: string | null
          suggested_action: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          impact_level?: Database["public"]["Enums"]["impact_level"]
          impact_reason?: string | null
          owner?: string | null
          product_module: Database["public"]["Enums"]["product_module"]
          status?: string | null
          suggested_action?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          impact_level?: Database["public"]["Enums"]["impact_level"]
          impact_reason?: string | null
          owner?: string | null
          product_module?: Database["public"]["Enums"]["product_module"]
          status?: string | null
          suggested_action?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_impacts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "intelligence_events"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content_json: Json
          data_origin: Database["public"]["Enums"]["data_origin"]
          date_end: string
          date_start: string
          generated_at: string
          generated_by: string | null
          id: string
          included_event_ids: string[] | null
          report_type: string
          time_filter_type: string
          verification_status: string | null
        }
        Insert: {
          content_json: Json
          data_origin?: Database["public"]["Enums"]["data_origin"]
          date_end: string
          date_start: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          included_event_ids?: string[] | null
          report_type: string
          time_filter_type?: string
          verification_status?: string | null
        }
        Update: {
          content_json?: Json
          data_origin?: Database["public"]["Enums"]["data_origin"]
          date_end?: string
          date_start?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          included_event_ids?: string[] | null
          report_type?: string
          time_filter_type?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          access_mode: Database["public"]["Enums"]["access_mode"]
          authority_level: Database["public"]["Enums"]["authority_level"]
          canonical_domain: string | null
          category: Database["public"]["Enums"]["intel_category"]
          collection_frequency: string | null
          collection_method: string | null
          connection_status: Database["public"]["Enums"]["connection_status"]
          created_at: string
          credential_configured: boolean
          data_origin: Database["public"]["Enums"]["data_origin"]
          enabled: boolean
          id: string
          is_official: boolean
          last_error_code: string | null
          last_error_message: string | null
          last_success_at: string | null
          last_tested_at: string | null
          name: string
          requires_auth: boolean
          source_type: string | null
          source_url: string
          timezone: string
          updated_at: string
        }
        Insert: {
          access_mode?: Database["public"]["Enums"]["access_mode"]
          authority_level: Database["public"]["Enums"]["authority_level"]
          canonical_domain?: string | null
          category: Database["public"]["Enums"]["intel_category"]
          collection_frequency?: string | null
          collection_method?: string | null
          connection_status?: Database["public"]["Enums"]["connection_status"]
          created_at?: string
          credential_configured?: boolean
          data_origin?: Database["public"]["Enums"]["data_origin"]
          enabled?: boolean
          id?: string
          is_official?: boolean
          last_error_code?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          last_tested_at?: string | null
          name: string
          requires_auth?: boolean
          source_type?: string | null
          source_url: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          access_mode?: Database["public"]["Enums"]["access_mode"]
          authority_level?: Database["public"]["Enums"]["authority_level"]
          canonical_domain?: string | null
          category?: Database["public"]["Enums"]["intel_category"]
          collection_frequency?: string | null
          collection_method?: string | null
          connection_status?: Database["public"]["Enums"]["connection_status"]
          created_at?: string
          credential_configured?: boolean
          data_origin?: Database["public"]["Enums"]["data_origin"]
          enabled?: boolean
          id?: string
          is_official?: boolean
          last_error_code?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          last_tested_at?: string | null
          name?: string
          requires_auth?: boolean
          source_type?: string | null
          source_url?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_test_runs: {
        Row: {
          component: string | null
          created_at: string
          details_json: Json | null
          error_summary: string | null
          finished_at: string | null
          id: string
          result: Database["public"]["Enums"]["check_result"] | null
          started_at: string
          test_name: string
        }
        Insert: {
          component?: string | null
          created_at?: string
          details_json?: Json | null
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          result?: Database["public"]["Enums"]["check_result"] | null
          started_at?: string
          test_name: string
        }
        Update: {
          component?: string | null
          created_at?: string
          details_json?: Json | null
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          result?: Database["public"]["Enums"]["check_result"] | null
          started_at?: string
          test_name?: string
        }
        Relationships: []
      }
      verification_runs: {
        Row: {
          accessibility_status:
            | Database["public"]["Enums"]["check_result"]
            | null
          blockers: string[] | null
          conflict_status: Database["public"]["Enums"]["check_result"] | null
          content_status: Database["public"]["Enums"]["check_result"] | null
          corroboration_status:
            | Database["public"]["Enums"]["check_result"]
            | null
          created_at: string
          details_json: Json | null
          evidence_id: string
          final_result: Database["public"]["Enums"]["check_result"] | null
          freshness_status: Database["public"]["Enums"]["check_result"] | null
          human_review_status:
            | Database["public"]["Enums"]["check_result"]
            | null
          id: string
          metadata_status: Database["public"]["Enums"]["check_result"] | null
          run_at: string
          snapshot_status: Database["public"]["Enums"]["check_result"] | null
          source_identity_status:
            | Database["public"]["Enums"]["check_result"]
            | null
        }
        Insert: {
          accessibility_status?:
            | Database["public"]["Enums"]["check_result"]
            | null
          blockers?: string[] | null
          conflict_status?: Database["public"]["Enums"]["check_result"] | null
          content_status?: Database["public"]["Enums"]["check_result"] | null
          corroboration_status?:
            | Database["public"]["Enums"]["check_result"]
            | null
          created_at?: string
          details_json?: Json | null
          evidence_id: string
          final_result?: Database["public"]["Enums"]["check_result"] | null
          freshness_status?: Database["public"]["Enums"]["check_result"] | null
          human_review_status?:
            | Database["public"]["Enums"]["check_result"]
            | null
          id?: string
          metadata_status?: Database["public"]["Enums"]["check_result"] | null
          run_at?: string
          snapshot_status?: Database["public"]["Enums"]["check_result"] | null
          source_identity_status?:
            | Database["public"]["Enums"]["check_result"]
            | null
        }
        Update: {
          accessibility_status?:
            | Database["public"]["Enums"]["check_result"]
            | null
          blockers?: string[] | null
          conflict_status?: Database["public"]["Enums"]["check_result"] | null
          content_status?: Database["public"]["Enums"]["check_result"] | null
          corroboration_status?:
            | Database["public"]["Enums"]["check_result"]
            | null
          created_at?: string
          details_json?: Json | null
          evidence_id?: string
          final_result?: Database["public"]["Enums"]["check_result"] | null
          freshness_status?: Database["public"]["Enums"]["check_result"] | null
          human_review_status?:
            | Database["public"]["Enums"]["check_result"]
            | null
          id?: string
          metadata_status?: Database["public"]["Enums"]["check_result"] | null
          run_at?: string
          snapshot_status?: Database["public"]["Enums"]["check_result"] | null
          source_identity_status?:
            | Database["public"]["Enums"]["check_result"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_runs_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      access_mode:
        | "public_web"
        | "public_api"
        | "oauth_api"
        | "login_manual"
        | "internal_connector"
        | "file_import"
        | "external_collection_service"
      authority_level: "S" | "A" | "B" | "C" | "D"
      check_result:
        | "passed"
        | "warning"
        | "blocked"
        | "unavailable"
        | "requires_manual_review"
      connection_status:
        | "unconfigured"
        | "testing"
        | "connected"
        | "degraded"
        | "auth_required"
        | "login_required"
        | "blocked"
        | "failed"
        | "disabled"
      data_origin: "real" | "sample"
      event_type:
        | "policy_change"
        | "competitor_feature"
        | "sentiment_hot"
        | "complaint_spike"
        | "regulatory_risk"
        | "product_opportunity"
      impact_level: "none" | "possible" | "clear" | "high"
      intel_category: "policy" | "competitor" | "sentiment"
      product_module:
        | "search"
        | "list"
        | "price"
        | "form"
        | "payment"
        | "order"
        | "aftersale"
        | "service"
        | "student_zone"
        | "child_zone"
        | "membership"
        | "intl"
      relation_type:
        | "supports"
        | "conflicts"
        | "background"
        | "competitor_reference"
        | "sentiment_signal"
      risk_level: "P1" | "P2" | "P3"
      run_status: "success" | "failed" | "running" | "partial" | "blocked"
      run_type: "scheduled" | "manual" | "retry" | "upload" | "browser_capture"
      verification_status:
        | "unverified"
        | "verifying"
        | "verified_online"
        | "verified_snapshot"
        | "lead_only"
        | "conflict"
        | "blocked"
        | "obsolete"
      workflow_status:
        | "new"
        | "evidence_check"
        | "human_review"
        | "confirmed"
        | "product_review"
        | "action_planned"
        | "assigned"
        | "in_progress"
        | "effect_review"
        | "closed"
        | "watching"
        | "invalid_lead"
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
    Enums: {
      access_mode: [
        "public_web",
        "public_api",
        "oauth_api",
        "login_manual",
        "internal_connector",
        "file_import",
        "external_collection_service",
      ],
      authority_level: ["S", "A", "B", "C", "D"],
      check_result: [
        "passed",
        "warning",
        "blocked",
        "unavailable",
        "requires_manual_review",
      ],
      connection_status: [
        "unconfigured",
        "testing",
        "connected",
        "degraded",
        "auth_required",
        "login_required",
        "blocked",
        "failed",
        "disabled",
      ],
      data_origin: ["real", "sample"],
      event_type: [
        "policy_change",
        "competitor_feature",
        "sentiment_hot",
        "complaint_spike",
        "regulatory_risk",
        "product_opportunity",
      ],
      impact_level: ["none", "possible", "clear", "high"],
      intel_category: ["policy", "competitor", "sentiment"],
      product_module: [
        "search",
        "list",
        "price",
        "form",
        "payment",
        "order",
        "aftersale",
        "service",
        "student_zone",
        "child_zone",
        "membership",
        "intl",
      ],
      relation_type: [
        "supports",
        "conflicts",
        "background",
        "competitor_reference",
        "sentiment_signal",
      ],
      risk_level: ["P1", "P2", "P3"],
      run_status: ["success", "failed", "running", "partial", "blocked"],
      run_type: ["scheduled", "manual", "retry", "upload", "browser_capture"],
      verification_status: [
        "unverified",
        "verifying",
        "verified_online",
        "verified_snapshot",
        "lead_only",
        "conflict",
        "blocked",
        "obsolete",
      ],
      workflow_status: [
        "new",
        "evidence_check",
        "human_review",
        "confirmed",
        "product_review",
        "action_planned",
        "assigned",
        "in_progress",
        "effect_review",
        "closed",
        "watching",
        "invalid_lead",
      ],
    },
  },
} as const
