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
      academic_years: {
        Row: {
          created_at: string
          created_by: string | null
          ends_on: string
          family_id: string | null
          id: string
          is_current: boolean
          name: string
          organization_id: string | null
          starts_on: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_on: string
          family_id?: string | null
          id?: string
          is_current?: boolean
          name: string
          organization_id?: string | null
          starts_on: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_on?: string
          family_id?: string | null
          id?: string
          is_current?: boolean
          name?: string
          organization_id?: string | null
          starts_on?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_years_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_years_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_years_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          academic_year_id: string | null
          activity_title: string
          ai_generated: boolean
          ai_suggestion_id: string | null
          created_at: string
          created_by: string | null
          date: string
          dedupe_key: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          entered_by: string | null
          family_id: string | null
          human_confirmed_at: string | null
          human_confirmed_by: string | null
          id: string
          materials: string | null
          organization_id: string | null
          portfolio_item_id: string | null
          resources: Json
          skill_ids: string[]
          source_id: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          staff_user_id: string | null
          student_id: string
          subject_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year_id?: string | null
          activity_title: string
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          entered_by?: string | null
          family_id?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          materials?: string | null
          organization_id?: string | null
          portfolio_item_id?: string | null
          resources?: Json
          skill_ids?: string[]
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          staff_user_id?: string | null
          student_id: string
          subject_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year_id?: string | null
          activity_title?: string
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          entered_by?: string | null
          family_id?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          materials?: string | null
          organization_id?: string | null
          portfolio_item_id?: string | null
          resources?: Json
          skill_ids?: string[]
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          staff_user_id?: string | null
          student_id?: string
          subject_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_human_confirmed_by_fkey"
            columns: ["human_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_suggestion_fk"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          ai_usage_event_id: string | null
          applied_record_id: string | null
          applied_record_type: string | null
          confidence: number | null
          confidence_band: "low" | "medium" | "high" | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          document_id: string | null
          edited_payload: Json | null
          expires_at: string | null
          family_id: string | null
          id: string
          kind:
            | "classify_document"
            | "create_portfolio_item"
            | "update_skill"
            | "create_activity_log"
            | "create_reading_log"
            | "create_assessment_result"
            | "update_learning_plan"
            | "create_learning_goal"
            | "file_compliance_document"
            | "create_lesson"
            | "link_document_to_student"
          organization_id: string | null
          payload: Json
          rationale: string | null
          requires_confirmation: boolean
          source_record_id: string | null
          source_record_type: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          status: "pending" | "accepted" | "rejected" | "expired" | "superseded"
          student_id: string | null
          updated_at: string
        }
        Insert: {
          ai_usage_event_id?: string | null
          applied_record_id?: string | null
          applied_record_type?: string | null
          confidence?: number | null
          confidence_band?: "low" | "medium" | "high" | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          document_id?: string | null
          edited_payload?: Json | null
          expires_at?: string | null
          family_id?: string | null
          id?: string
          kind:
            | "classify_document"
            | "create_portfolio_item"
            | "update_skill"
            | "create_activity_log"
            | "create_reading_log"
            | "create_assessment_result"
            | "update_learning_plan"
            | "create_learning_goal"
            | "file_compliance_document"
            | "create_lesson"
            | "link_document_to_student"
          organization_id?: string | null
          payload: Json
          rationale?: string | null
          requires_confirmation?: boolean
          source_record_id?: string | null
          source_record_type?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          status?:
            | "pending"
            | "accepted"
            | "rejected"
            | "expired"
            | "superseded"
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_usage_event_id?: string | null
          applied_record_id?: string | null
          applied_record_type?: string | null
          confidence?: number | null
          confidence_band?: "low" | "medium" | "high" | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          document_id?: string | null
          edited_payload?: Json | null
          expires_at?: string | null
          family_id?: string | null
          id?: string
          kind?:
            | "classify_document"
            | "create_portfolio_item"
            | "update_skill"
            | "create_activity_log"
            | "create_reading_log"
            | "create_assessment_result"
            | "update_learning_plan"
            | "create_learning_goal"
            | "file_compliance_document"
            | "create_lesson"
            | "link_document_to_student"
          organization_id?: string | null
          payload?: Json
          rationale?: string | null
          requires_confirmation?: boolean
          source_record_id?: string | null
          source_record_type?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          status?:
            | "pending"
            | "accepted"
            | "rejected"
            | "expired"
            | "superseded"
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_usage_fk"
            columns: ["ai_usage_event_id"]
            isOneToOne: false
            referencedRelation: "ai_usage_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_usage_fk"
            columns: ["ai_usage_event_id"]
            isOneToOne: false
            referencedRelation: "ai_usage_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_daily: {
        Row: {
          cached_tokens: number
          calls: number
          created_at: string
          day: string
          errors: number
          estimated_cost_usd: number
          family_id: string | null
          feature:
            | "document_classification"
            | "document_extraction"
            | "worksheet_analysis"
            | "lesson_generation"
            | "weekly_report"
            | "assistant"
            | "skill_analysis"
            | "portfolio_description"
            | "progress_analysis"
            | "daily_brief"
            | "translation"
          id: string
          input_tokens: number
          organization_id: string | null
          output_tokens: number
          updated_at: string
        }
        Insert: {
          cached_tokens?: number
          calls?: number
          created_at?: string
          day: string
          errors?: number
          estimated_cost_usd?: number
          family_id?: string | null
          feature:
            | "document_classification"
            | "document_extraction"
            | "worksheet_analysis"
            | "lesson_generation"
            | "weekly_report"
            | "assistant"
            | "skill_analysis"
            | "portfolio_description"
            | "progress_analysis"
            | "daily_brief"
            | "translation"
          id?: string
          input_tokens?: number
          organization_id?: string | null
          output_tokens?: number
          updated_at?: string
        }
        Update: {
          cached_tokens?: number
          calls?: number
          created_at?: string
          day?: string
          errors?: number
          estimated_cost_usd?: number
          family_id?: string | null
          feature?:
            | "document_classification"
            | "document_extraction"
            | "worksheet_analysis"
            | "lesson_generation"
            | "weekly_report"
            | "assistant"
            | "skill_analysis"
            | "portfolio_description"
            | "progress_analysis"
            | "daily_brief"
            | "translation"
          id?: string
          input_tokens?: number
          organization_id?: string | null
          output_tokens?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_daily_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_daily_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_events: {
        Row: {
          cached_tokens: number | null
          created_at: string
          document_id: string | null
          error: string | null
          estimated_cost_usd: number | null
          family_id: string | null
          feature:
            | "document_classification"
            | "document_extraction"
            | "worksheet_analysis"
            | "lesson_generation"
            | "weekly_report"
            | "assistant"
            | "skill_analysis"
            | "portfolio_description"
            | "progress_analysis"
            | "daily_brief"
            | "translation"
          feedback: string | null
          id: string
          input_summary: string | null
          input_tokens: number | null
          latency_ms: number | null
          model: string
          organization_id: string | null
          output_summary: string | null
          output_tokens: number | null
          permission_scope: Json
          prompt_version: string | null
          provider: string
          status:
            | "success"
            | "error"
            | "timeout"
            | "refused"
            | "rate_limited"
            | "budget_blocked"
          student_id: string | null
          suggestion_id: string | null
          user_id: string | null
        }
        Insert: {
          cached_tokens?: number | null
          created_at?: string
          document_id?: string | null
          error?: string | null
          estimated_cost_usd?: number | null
          family_id?: string | null
          feature:
            | "document_classification"
            | "document_extraction"
            | "worksheet_analysis"
            | "lesson_generation"
            | "weekly_report"
            | "assistant"
            | "skill_analysis"
            | "portfolio_description"
            | "progress_analysis"
            | "daily_brief"
            | "translation"
          feedback?: string | null
          id?: string
          input_summary?: string | null
          input_tokens?: number | null
          latency_ms?: number | null
          model: string
          organization_id?: string | null
          output_summary?: string | null
          output_tokens?: number | null
          permission_scope?: Json
          prompt_version?: string | null
          provider: string
          status?:
            | "success"
            | "error"
            | "timeout"
            | "refused"
            | "rate_limited"
            | "budget_blocked"
          student_id?: string | null
          suggestion_id?: string | null
          user_id?: string | null
        }
        Update: {
          cached_tokens?: number | null
          created_at?: string
          document_id?: string | null
          error?: string | null
          estimated_cost_usd?: number | null
          family_id?: string | null
          feature?:
            | "document_classification"
            | "document_extraction"
            | "worksheet_analysis"
            | "lesson_generation"
            | "weekly_report"
            | "assistant"
            | "skill_analysis"
            | "portfolio_description"
            | "progress_analysis"
            | "daily_brief"
            | "translation"
          feedback?: string | null
          id?: string
          input_summary?: string | null
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string
          organization_id?: string | null
          output_summary?: string | null
          output_tokens?: number | null
          permission_scope?: Json
          prompt_version?: string | null
          provider?: string
          status?:
            | "success"
            | "error"
            | "timeout"
            | "refused"
            | "rate_limited"
            | "budget_blocked"
          student_id?: string | null
          suggestion_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: Json
          body: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          locale: string | null
          organization_id: string
          pinned: boolean
          publish_at: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience?: Json
          body: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          locale?: string | null
          organization_id: string
          pinned?: boolean
          publish_at?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          locale?: string | null
          organization_id?: string
          pinned?: boolean
          publish_at?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          ai_generated: boolean
          ai_suggestion_id: string | null
          assessment_id: string
          confidence:
            | "ai_suggested"
            | "self_reported"
            | "parent_reported"
            | "teacher_observed"
            | "assessment_confirmed"
          created_at: string
          created_by: string | null
          entered_by: string | null
          human_confirmed_at: string | null
          human_confirmed_by: string | null
          id: string
          notes: string | null
          organization_id: string | null
          per_skill: Json
          percentage: number | null
          points_earned: number | null
          recorded_by: string | null
          source_id: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          assessment_id: string
          confidence?:
            | "ai_suggested"
            | "self_reported"
            | "parent_reported"
            | "teacher_observed"
            | "assessment_confirmed"
          created_at?: string
          created_by?: string | null
          entered_by?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          per_skill?: Json
          percentage?: number | null
          points_earned?: number | null
          recorded_by?: string | null
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          assessment_id?: string
          confidence?:
            | "ai_suggested"
            | "self_reported"
            | "parent_reported"
            | "teacher_observed"
            | "assessment_confirmed"
          created_at?: string
          created_by?: string | null
          entered_by?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          per_skill?: Json
          percentage?: number | null
          points_earned?: number | null
          recorded_by?: string | null
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_human_confirmed_by_fkey"
            columns: ["human_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_suggestion_fk"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          academic_year_id: string | null
          administered_on: string
          ai_generated: boolean
          ai_suggestion_id: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          entered_by: string | null
          family_id: string | null
          human_confirmed_at: string | null
          human_confirmed_by: string | null
          id: string
          organization_id: string | null
          points_possible: number | null
          skill_ids: string[]
          source_document_id: string | null
          source_id: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id: string | null
          subject_id: string | null
          title: string
          type:
            | "quiz"
            | "test"
            | "diagnostic"
            | "benchmark"
            | "standardized"
            | "observation"
            | "portfolio_review"
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year_id?: string | null
          administered_on?: string
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entered_by?: string | null
          family_id?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          organization_id?: string | null
          points_possible?: number | null
          skill_ids?: string[]
          source_document_id?: string | null
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id?: string | null
          subject_id?: string | null
          title: string
          type?:
            | "quiz"
            | "test"
            | "diagnostic"
            | "benchmark"
            | "standardized"
            | "observation"
            | "portfolio_review"
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year_id?: string | null
          administered_on?: string
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entered_by?: string | null
          family_id?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          organization_id?: string | null
          points_possible?: number | null
          skill_ids?: string[]
          source_document_id?: string | null
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id?: string | null
          subject_id?: string | null
          title?: string
          type?:
            | "quiz"
            | "test"
            | "diagnostic"
            | "benchmark"
            | "standardized"
            | "observation"
            | "portfolio_review"
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_human_confirmed_by_fkey"
            columns: ["human_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_source_document_fk"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_suggestion_fk"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_students: {
        Row: {
          assignment_id: string
          created_at: string
          due_on: string | null
          id: string
          status:
            | "assigned"
            | "in_progress"
            | "submitted"
            | "graded"
            | "returned"
            | "excused"
            | "missing"
          student_id: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          due_on?: string | null
          id?: string
          status?:
            | "assigned"
            | "in_progress"
            | "submitted"
            | "graded"
            | "returned"
            | "excused"
            | "missing"
          student_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          due_on?: string | null
          id?: string
          status?:
            | "assigned"
            | "in_progress"
            | "submitted"
            | "graded"
            | "returned"
            | "excused"
            | "missing"
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_students_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          created_at: string
          created_by: string | null
          document_ids: string[]
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          organization_id: string | null
          percentage: number | null
          score: number | null
          status:
            | "assigned"
            | "in_progress"
            | "submitted"
            | "graded"
            | "returned"
            | "excused"
            | "missing"
          student_id: string
          submitted_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assignment_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          document_ids?: string[]
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          organization_id?: string | null
          percentage?: number | null
          score?: number | null
          status?:
            | "assigned"
            | "in_progress"
            | "submitted"
            | "graded"
            | "returned"
            | "excused"
            | "missing"
          student_id: string
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assignment_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          document_ids?: string[]
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          organization_id?: string | null
          percentage?: number | null
          score?: number | null
          status?:
            | "assigned"
            | "in_progress"
            | "submitted"
            | "graded"
            | "returned"
            | "excused"
            | "missing"
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assigned_by: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_on: string | null
          family_id: string | null
          id: string
          instructions: string | null
          lesson_id: string | null
          organization_id: string | null
          points_possible: number | null
          skill_ids: string[]
          status: string
          subject_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_by?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_on?: string | null
          family_id?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          organization_id?: string | null
          points_possible?: number | null
          skill_ids?: string[]
          status?: string
          subject_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_by?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_on?: string | null
          family_id?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          organization_id?: string | null
          points_possible?: number | null
          skill_ids?: string[]
          status?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string | null
          date: string
          event_instance_id: string | null
          id: string
          method: "teacher" | "parent_checkin" | "self" | "system" | "import"
          minutes: number | null
          notes: string | null
          organization_id: string | null
          record_class:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          recorded_by: string | null
          status: "present" | "absent" | "late" | "excused" | "virtual"
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          event_instance_id?: string | null
          id?: string
          method?: "teacher" | "parent_checkin" | "self" | "system" | "import"
          minutes?: number | null
          notes?: string | null
          organization_id?: string | null
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          recorded_by?: string | null
          status: "present" | "absent" | "late" | "excused" | "virtual"
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          event_instance_id?: string | null
          id?: string
          method?: "teacher" | "parent_checkin" | "self" | "system" | "import"
          minutes?: number | null
          notes?: string | null
          organization_id?: string | null
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          recorded_by?: string | null
          status?: "present" | "absent" | "late" | "excused" | "virtual"
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_event_instance_id_fkey"
            columns: ["event_instance_id"]
            isOneToOne: false
            referencedRelation: "calendar_event_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs_2026_01: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_02: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_03: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_04: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_05: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_06: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_07: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_08: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_09: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_10: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_11: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_12: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_01: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_02: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_03: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_04: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_05: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_06: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_07: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_08: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_09: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_10: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_11: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2027_12: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_01: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_02: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_03: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_04: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_05: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_06: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_07: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_08: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_09: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_10: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_11: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_2028_12: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs_default: {
        Row: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          family_id: string | null
          id: string
          ip: unknown
          metadata: Json
          organization_id: string | null
          request_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          user_agent: string | null
        }
        Insert: {
          action:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?:
            | "document_uploaded"
            | "document_viewed"
            | "document_downloaded"
            | "document_deleted"
            | "evaluation_viewed"
            | "evaluation_signed"
            | "evaluation_completed"
            | "compliance_document_generated"
            | "compliance_document_submitted"
            | "compliance_status_changed"
            | "permissions_changed"
            | "student_access_granted"
            | "student_access_revoked"
            | "staff_added"
            | "staff_removed"
            | "student_created"
            | "student_archived"
            | "report_exported"
            | "report_shared"
            | "data_exported"
            | "ai_suggestion_applied"
            | "ai_suggestion_rejected"
            | "consent_granted"
            | "consent_revoked"
            | "support_session_opened"
            | "support_session_closed"
            | "organization_membership_started"
            | "organization_membership_ended"
            | "login_succeeded"
            | "login_failed"
            | "user_invited"
            | "document_shared"
            | "document_unshared"
            | "document_visibility_changed"
            | "authorization_denied"
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      calendar_event_instances: {
        Row: {
          class_id: string | null
          created_at: string
          ends_at: string
          event_id: string
          family_id: string | null
          id: string
          occurrence_date: string
          organization_id: string | null
          overridden: boolean
          starts_at: string
          status: "scheduled" | "cancelled" | "completed"
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          ends_at: string
          event_id: string
          family_id?: string | null
          id?: string
          occurrence_date: string
          organization_id?: string | null
          overridden?: boolean
          starts_at: string
          status?: "scheduled" | "cancelled" | "completed"
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          ends_at?: string
          event_id?: string
          family_id?: string | null
          id?: string
          occurrence_date?: string
          organization_id?: string | null
          overridden?: boolean
          starts_at?: string
          status?: "scheduled" | "cancelled" | "completed"
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_instances_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_instances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_instances_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          academic_year_id: string | null
          all_day: boolean
          class_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          ends_at: string
          exdates: string[]
          family_id: string | null
          id: string
          lesson_id: string | null
          location_id: string | null
          metadata: Json
          organization_id: string | null
          recurrence_end_date: string | null
          recurrence_parent_id: string | null
          reminder_minutes: number[]
          rrule: string | null
          starts_at: string
          status: "scheduled" | "cancelled" | "completed"
          timezone: string
          title: string
          type:
            | "class"
            | "lesson"
            | "tutoring"
            | "evaluation"
            | "field_trip"
            | "therapy"
            | "parent_meeting"
            | "staff_meeting"
            | "extracurricular"
            | "deadline"
            | "holiday"
            | "assessment"
            | "other"
          updated_at: string
          updated_by: string | null
          visibility: "family" | "class" | "organization" | "public_org"
        }
        Insert: {
          academic_year_id?: string | null
          all_day?: boolean
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          ends_at: string
          exdates?: string[]
          family_id?: string | null
          id?: string
          lesson_id?: string | null
          location_id?: string | null
          metadata?: Json
          organization_id?: string | null
          recurrence_end_date?: string | null
          recurrence_parent_id?: string | null
          reminder_minutes?: number[]
          rrule?: string | null
          starts_at: string
          status?: "scheduled" | "cancelled" | "completed"
          timezone?: string
          title: string
          type?:
            | "class"
            | "lesson"
            | "tutoring"
            | "evaluation"
            | "field_trip"
            | "therapy"
            | "parent_meeting"
            | "staff_meeting"
            | "extracurricular"
            | "deadline"
            | "holiday"
            | "assessment"
            | "other"
          updated_at?: string
          updated_by?: string | null
          visibility?: "family" | "class" | "organization" | "public_org"
        }
        Update: {
          academic_year_id?: string | null
          all_day?: boolean
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          ends_at?: string
          exdates?: string[]
          family_id?: string | null
          id?: string
          lesson_id?: string | null
          location_id?: string | null
          metadata?: Json
          organization_id?: string | null
          recurrence_end_date?: string | null
          recurrence_parent_id?: string | null
          reminder_minutes?: number[]
          rrule?: string | null
          starts_at?: string
          status?: "scheduled" | "cancelled" | "completed"
          timezone?: string
          title?: string
          type?:
            | "class"
            | "lesson"
            | "tutoring"
            | "evaluation"
            | "field_trip"
            | "therapy"
            | "parent_meeting"
            | "staff_meeting"
            | "extracurricular"
            | "deadline"
            | "holiday"
            | "assessment"
            | "other"
          updated_at?: string
          updated_by?: string | null
          visibility?: "family" | "class" | "organization" | "public_org"
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_lesson_fk"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_staff: {
        Row: {
          active: boolean
          class_id: string
          created_at: string
          created_by: string | null
          id: string
          role: "lead" | "assistant" | "substitute" | "observer"
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          class_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: "lead" | "assistant" | "substitute" | "observer"
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          class_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: "lead" | "assistant" | "substitute" | "observer"
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_staff_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_staff_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_staff_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          active: boolean
          class_id: string
          created_at: string
          created_by: string | null
          ended_on: string | null
          enrolled_on: string
          id: string
          status: string
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          class_id: string
          created_at?: string
          created_by?: string | null
          ended_on?: string | null
          enrolled_on?: string
          id?: string
          status?: string
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          class_id?: string
          created_at?: string
          created_by?: string | null
          ended_on?: string | null
          enrolled_on?: string
          id?: string
          status?: string
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string | null
          age_max: number | null
          age_min: number | null
          capacity: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          grade_levels: string[]
          id: string
          location_id: string | null
          name: string
          organization_id: string
          schedule: Json
          status: string
          subject_id: string | null
          type:
            | "class"
            | "pod"
            | "group"
            | "program"
            | "club"
            | "tutoring_group"
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year_id?: string | null
          age_max?: number | null
          age_min?: number | null
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          grade_levels?: string[]
          id?: string
          location_id?: string | null
          name: string
          organization_id: string
          schedule?: Json
          status?: string
          subject_id?: string | null
          type?:
            | "class"
            | "pod"
            | "group"
            | "program"
            | "club"
            | "tutoring_group"
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year_id?: string | null
          age_max?: number | null
          age_min?: number | null
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          grade_levels?: string[]
          id?: string
          location_id?: string | null
          name?: string
          organization_id?: string
          schedule?: Json
          status?: string
          subject_id?: string | null
          type?:
            | "class"
            | "pod"
            | "group"
            | "program"
            | "club"
            | "tutoring_group"
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_packs: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          locale: string
          name: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          state_code: string
          status: "draft" | "active" | "deprecated"
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          locale?: string
          name: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          state_code: string
          status?: "draft" | "active" | "deprecated"
          updated_at?: string
          updated_by?: string | null
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          locale?: string
          name?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          state_code?: string
          status?: "draft" | "active" | "deprecated"
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_packs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_packs_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "compliance_packs_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_packs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_requirements: {
        Row: {
          academic_year_id: string | null
          computed_at: string
          computed_inputs: Json
          created_at: string
          due_on: string | null
          grace_until: string | null
          id: string
          obligation_level: "required" | "recommended" | "optional" | "unknown"
          organization_id: string | null
          pack_version: string | null
          rule_id: string
          satisfied_at: string | null
          satisfied_by_id: string | null
          satisfied_by_type: string | null
          status:
            | "current"
            | "upcoming"
            | "needs_attention"
            | "incomplete"
            | "overdue"
            | "not_applicable"
            | "unknown"
          student_id: string
          updated_at: string
          window_opens_on: string | null
        }
        Insert: {
          academic_year_id?: string | null
          computed_at?: string
          computed_inputs?: Json
          created_at?: string
          due_on?: string | null
          grace_until?: string | null
          id?: string
          obligation_level?: "required" | "recommended" | "optional" | "unknown"
          organization_id?: string | null
          pack_version?: string | null
          rule_id: string
          satisfied_at?: string | null
          satisfied_by_id?: string | null
          satisfied_by_type?: string | null
          status?:
            | "current"
            | "upcoming"
            | "needs_attention"
            | "incomplete"
            | "overdue"
            | "not_applicable"
            | "unknown"
          student_id: string
          updated_at?: string
          window_opens_on?: string | null
        }
        Update: {
          academic_year_id?: string | null
          computed_at?: string
          computed_inputs?: Json
          created_at?: string
          due_on?: string | null
          grace_until?: string | null
          id?: string
          obligation_level?: "required" | "recommended" | "optional" | "unknown"
          organization_id?: string | null
          pack_version?: string | null
          rule_id?: string
          satisfied_at?: string | null
          satisfied_by_id?: string | null
          satisfied_by_type?: string | null
          status?:
            | "current"
            | "upcoming"
            | "needs_attention"
            | "incomplete"
            | "overdue"
            | "not_applicable"
            | "unknown"
          student_id?: string
          updated_at?: string
          window_opens_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_requirements_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_requirements_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_requirements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          active: boolean
          admin_notes: string | null
          applies_to: Json
          authoritative_source_url: string
          authority_citation: string
          category:
            | "registration"
            | "evaluation"
            | "portfolio"
            | "termination"
            | "records"
            | "attendance"
            | "other"
          code: string
          county: string | null
          created_at: string
          created_by: string | null
          document_template_id: string | null
          due_date_logic: Json
          id: string
          last_verified_on: string | null
          obligation_level: "required" | "recommended" | "optional" | "unknown"
          pack_id: string
          reminder_schedule: Json
          required_fields: Json
          requirement_text: string
          retention: Json
          satisfied_by: Json
          sequence: number
          state_code: string
          submission_destination: Json
          submission_method: "email" | "mail" | "portal" | "in_person" | "none"
          title: string
          trigger: Json
          updated_at: string
          updated_by: string | null
          verified_by: string | null
        }
        Insert: {
          active?: boolean
          admin_notes?: string | null
          applies_to?: Json
          authoritative_source_url: string
          authority_citation: string
          category:
            | "registration"
            | "evaluation"
            | "portfolio"
            | "termination"
            | "records"
            | "attendance"
            | "other"
          code: string
          county?: string | null
          created_at?: string
          created_by?: string | null
          document_template_id?: string | null
          due_date_logic?: Json
          id?: string
          last_verified_on?: string | null
          obligation_level?: "required" | "recommended" | "optional" | "unknown"
          pack_id: string
          reminder_schedule?: Json
          required_fields?: Json
          requirement_text: string
          retention?: Json
          satisfied_by?: Json
          sequence?: number
          state_code: string
          submission_destination?: Json
          submission_method?: "email" | "mail" | "portal" | "in_person" | "none"
          title: string
          trigger?: Json
          updated_at?: string
          updated_by?: string | null
          verified_by?: string | null
        }
        Update: {
          active?: boolean
          admin_notes?: string | null
          applies_to?: Json
          authoritative_source_url?: string
          authority_citation?: string
          category?:
            | "registration"
            | "evaluation"
            | "portfolio"
            | "termination"
            | "records"
            | "attendance"
            | "other"
          code?: string
          county?: string | null
          created_at?: string
          created_by?: string | null
          document_template_id?: string | null
          due_date_logic?: Json
          id?: string
          last_verified_on?: string | null
          obligation_level?: "required" | "recommended" | "optional" | "unknown"
          pack_id?: string
          reminder_schedule?: Json
          required_fields?: Json
          requirement_text?: string
          retention?: Json
          satisfied_by?: Json
          sequence?: number
          state_code?: string
          submission_destination?: Json
          submission_method?: "email" | "mail" | "portal" | "in_person" | "none"
          title?: string
          trigger?: Json
          updated_at?: string
          updated_by?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_rules_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "compliance_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_rules_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_policies: {
        Row: {
          body: string
          consent_type:
            | "guardian_relationship"
            | "student_account"
            | "ai_document_processing"
            | "ai_academic_analysis"
            | "evaluator_access"
            | "provider_access"
            | "photo_media_use"
            | "communication"
            | "organization_data_sharing"
            | "electronic_signature"
            | "directory_listing"
            | "research_participation"
          created_at: string
          created_by: string | null
          document_version: string | null
          effective_from: string
          effective_to: string | null
          id: string
          locale: string
          organization_id: string | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          body: string
          consent_type:
            | "guardian_relationship"
            | "student_account"
            | "ai_document_processing"
            | "ai_academic_analysis"
            | "evaluator_access"
            | "provider_access"
            | "photo_media_use"
            | "communication"
            | "organization_data_sharing"
            | "electronic_signature"
            | "directory_listing"
            | "research_participation"
          created_at?: string
          created_by?: string | null
          document_version?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          locale?: string
          organization_id?: string | null
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          body?: string
          consent_type?:
            | "guardian_relationship"
            | "student_account"
            | "ai_document_processing"
            | "ai_academic_analysis"
            | "evaluator_access"
            | "provider_access"
            | "photo_media_use"
            | "communication"
            | "organization_data_sharing"
            | "electronic_signature"
            | "directory_listing"
            | "research_participation"
          created_at?: string
          created_by?: string | null
          document_version?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          locale?: string
          organization_id?: string | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_policies_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "consent_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          consent_policy_id: string | null
          consent_type:
            | "guardian_relationship"
            | "student_account"
            | "ai_document_processing"
            | "ai_academic_analysis"
            | "evaluator_access"
            | "provider_access"
            | "photo_media_use"
            | "communication"
            | "organization_data_sharing"
            | "electronic_signature"
            | "directory_listing"
            | "research_participation"
          created_at: string
          document_version: string | null
          family_id: string | null
          granted: boolean
          granted_at: string | null
          guardian_id: string | null
          id: string
          locale: string | null
          metadata: Json
          method:
            | "web_checkbox"
            | "web_signature"
            | "uploaded_document"
            | "verbal_recorded"
            | "email_confirmation"
            | "import"
          organization_id: string | null
          policy_version: string | null
          recorded_by: string | null
          revoked_at: string | null
          scope: Json
          seq: number
          subject_student_id: string | null
          subject_user_id: string | null
          supersedes_id: string | null
        }
        Insert: {
          consent_policy_id?: string | null
          consent_type:
            | "guardian_relationship"
            | "student_account"
            | "ai_document_processing"
            | "ai_academic_analysis"
            | "evaluator_access"
            | "provider_access"
            | "photo_media_use"
            | "communication"
            | "organization_data_sharing"
            | "electronic_signature"
            | "directory_listing"
            | "research_participation"
          created_at?: string
          document_version?: string | null
          family_id?: string | null
          granted: boolean
          granted_at?: string | null
          guardian_id?: string | null
          id?: string
          locale?: string | null
          metadata?: Json
          method?:
            | "web_checkbox"
            | "web_signature"
            | "uploaded_document"
            | "verbal_recorded"
            | "email_confirmation"
            | "import"
          organization_id?: string | null
          policy_version?: string | null
          recorded_by?: string | null
          revoked_at?: string | null
          scope?: Json
          seq?: never
          subject_student_id?: string | null
          subject_user_id?: string | null
          supersedes_id?: string | null
        }
        Update: {
          consent_policy_id?: string | null
          consent_type?:
            | "guardian_relationship"
            | "student_account"
            | "ai_document_processing"
            | "ai_academic_analysis"
            | "evaluator_access"
            | "provider_access"
            | "photo_media_use"
            | "communication"
            | "organization_data_sharing"
            | "electronic_signature"
            | "directory_listing"
            | "research_participation"
          created_at?: string
          document_version?: string | null
          family_id?: string | null
          granted?: boolean
          granted_at?: string | null
          guardian_id?: string | null
          id?: string
          locale?: string | null
          metadata?: Json
          method?:
            | "web_checkbox"
            | "web_signature"
            | "uploaded_document"
            | "verbal_recorded"
            | "email_confirmation"
            | "import"
          organization_id?: string | null
          policy_version?: string | null
          recorded_by?: string | null
          revoked_at?: string | null
          scope?: Json
          seq?: never
          subject_student_id?: string | null
          subject_user_id?: string | null
          supersedes_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_consent_policy_id_fkey"
            columns: ["consent_policy_id"]
            isOneToOne: false
            referencedRelation: "consent_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_subject_student_id_fkey"
            columns: ["subject_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "current_consents"
            referencedColumns: ["consent_id"]
          },
        ]
      }
      content_translations: {
        Row: {
          created_at: string
          created_by: string | null
          field: string
          id: string
          is_machine_translated: boolean
          locale: string
          organization_id: string | null
          record_id: string
          record_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          field: string
          id?: string
          is_machine_translated?: boolean
          locale: string
          organization_id?: string | null
          record_id: string
          record_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          field?: string
          id?: string
          is_machine_translated?: boolean
          locale?: string
          organization_id?: string | null
          record_id?: string
          record_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
        ]
      }
      data_ownership_registry: {
        Row: {
          created_at: string
          export_excludes: string | null
          export_filter: string | null
          family_retains_on_exit: boolean
          id: string
          included_in_family_export: boolean
          notes: string | null
          org_retains_on_exit: boolean
          owner: string
          record_class:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          export_excludes?: string | null
          export_filter?: string | null
          family_retains_on_exit: boolean
          id?: string
          included_in_family_export: boolean
          notes?: string | null
          org_retains_on_exit: boolean
          owner: string
          record_class:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          export_excludes?: string | null
          export_filter?: string | null
          family_retains_on_exit?: boolean
          id?: string
          included_in_family_export?: boolean
          notes?: string | null
          org_retains_on_exit?: boolean
          owner?: string
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      district_contacts: {
        Row: {
          active: boolean
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_name: string | null
          county: string
          created_at: string
          created_by: string | null
          district_name: string | null
          email: string | null
          id: string
          last_verified_on: string | null
          notes: string | null
          office_name: string | null
          phone: string | null
          portal_url: string | null
          postal_code: string | null
          source_url: string | null
          state_code: string
          updated_at: string
          updated_by: string | null
          verified_by: string | null
        }
        Insert: {
          active?: boolean
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_name?: string | null
          county: string
          created_at?: string
          created_by?: string | null
          district_name?: string | null
          email?: string | null
          id?: string
          last_verified_on?: string | null
          notes?: string | null
          office_name?: string | null
          phone?: string | null
          portal_url?: string | null
          postal_code?: string | null
          source_url?: string | null
          state_code: string
          updated_at?: string
          updated_by?: string | null
          verified_by?: string | null
        }
        Update: {
          active?: boolean
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_name?: string | null
          county?: string
          created_at?: string
          created_by?: string | null
          district_name?: string | null
          email?: string | null
          id?: string
          last_verified_on?: string | null
          notes?: string | null
          office_name?: string | null
          phone?: string | null
          portal_url?: string | null
          postal_code?: string | null
          source_url?: string | null
          state_code?: string
          updated_at?: string
          updated_by?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "district_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "district_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "district_contacts_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_ai_analysis: {
        Row: {
          ai_usage_event_id: string | null
          confidence: number | null
          confidence_band: "low" | "medium" | "high" | null
          created_at: string
          detected_entities: Json
          document_id: string
          duration_ms: number | null
          error: string | null
          extracted: Json
          family_id: string | null
          id: string
          missing_fields: Json
          model: string
          ocr_used: boolean
          organization_id: string | null
          page_confidences: Json
          prompt_version: string
          provider: string
          raw_response: Json | null
          schema_version: string
          status: string
          text_content: string | null
          unreadable_regions: Json
          updated_at: string
        }
        Insert: {
          ai_usage_event_id?: string | null
          confidence?: number | null
          confidence_band?: "low" | "medium" | "high" | null
          created_at?: string
          detected_entities?: Json
          document_id: string
          duration_ms?: number | null
          error?: string | null
          extracted?: Json
          family_id?: string | null
          id?: string
          missing_fields?: Json
          model: string
          ocr_used?: boolean
          organization_id?: string | null
          page_confidences?: Json
          prompt_version: string
          provider: string
          raw_response?: Json | null
          schema_version?: string
          status?: string
          text_content?: string | null
          unreadable_regions?: Json
          updated_at?: string
        }
        Update: {
          ai_usage_event_id?: string | null
          confidence?: number | null
          confidence_band?: "low" | "medium" | "high" | null
          created_at?: string
          detected_entities?: Json
          document_id?: string
          duration_ms?: number | null
          error?: string | null
          extracted?: Json
          family_id?: string | null
          id?: string
          missing_fields?: Json
          model?: string
          ocr_used?: boolean
          organization_id?: string | null
          page_confidences?: Json
          prompt_version?: string
          provider?: string
          raw_response?: Json | null
          schema_version?: string
          status?: string
          text_content?: string | null
          unreadable_regions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daa_usage_fk"
            columns: ["ai_usage_event_id"]
            isOneToOne: false
            referencedRelation: "ai_usage_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daa_usage_fk"
            columns: ["ai_usage_event_id"]
            isOneToOne: false
            referencedRelation: "ai_usage_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ai_analysis_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ai_analysis_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ai_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          can_download: boolean
          created_at: string
          document_id: string
          expires_at: string | null
          id: string
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          shared_at: string
          shared_by: string
          shared_with_grant_id: string | null
          shared_with_organization_id: string | null
          shared_with_user_id: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          can_download?: boolean
          created_at?: string
          document_id: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          shared_at?: string
          shared_by: string
          shared_with_grant_id?: string | null
          shared_with_organization_id?: string | null
          shared_with_user_id?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          can_download?: boolean
          created_at?: string
          document_id?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          shared_at?: string
          shared_by?: string
          shared_with_grant_id?: string | null
          shared_with_organization_id?: string | null
          shared_with_user_id?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_with_grant_id_fkey"
            columns: ["shared_with_grant_id"]
            isOneToOne: false
            referencedRelation: "student_access_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_with_organization_id_fkey"
            columns: ["shared_with_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      document_submissions: {
        Row: {
          acknowledged_at: string | null
          approved_at: string | null
          approved_by: string | null
          confirmation_document_id: string | null
          confirmation_note: string | null
          created_at: string
          created_by: string | null
          destination: Json
          district_contact_id: string | null
          document_id: string | null
          failure_reason: string | null
          family_id: string | null
          form_data: Json
          id: string
          idempotency_key: string | null
          method: "email" | "mail" | "portal" | "in_person" | "none"
          organization_id: string | null
          prepared_by: string | null
          provider_message_id: string | null
          requirement_id: string | null
          rule_id: string | null
          sent_at: string | null
          sent_by: string | null
          signature_id: string | null
          status:
            | "draft"
            | "ready"
            | "awaiting_confirmation"
            | "sent"
            | "delivered"
            | "acknowledged"
            | "failed"
            | "manual"
          student_id: string
          transmission_evidence: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          confirmation_document_id?: string | null
          confirmation_note?: string | null
          created_at?: string
          created_by?: string | null
          destination?: Json
          district_contact_id?: string | null
          document_id?: string | null
          failure_reason?: string | null
          family_id?: string | null
          form_data?: Json
          id?: string
          idempotency_key?: string | null
          method: "email" | "mail" | "portal" | "in_person" | "none"
          organization_id?: string | null
          prepared_by?: string | null
          provider_message_id?: string | null
          requirement_id?: string | null
          rule_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          signature_id?: string | null
          status?:
            | "draft"
            | "ready"
            | "awaiting_confirmation"
            | "sent"
            | "delivered"
            | "acknowledged"
            | "failed"
            | "manual"
          student_id: string
          transmission_evidence?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          confirmation_document_id?: string | null
          confirmation_note?: string | null
          created_at?: string
          created_by?: string | null
          destination?: Json
          district_contact_id?: string | null
          document_id?: string | null
          failure_reason?: string | null
          family_id?: string | null
          form_data?: Json
          id?: string
          idempotency_key?: string | null
          method?: "email" | "mail" | "portal" | "in_person" | "none"
          organization_id?: string | null
          prepared_by?: string | null
          provider_message_id?: string | null
          requirement_id?: string | null
          rule_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          signature_id?: string | null
          status?:
            | "draft"
            | "ready"
            | "awaiting_confirmation"
            | "sent"
            | "delivered"
            | "acknowledged"
            | "failed"
            | "manual"
          student_id?: string
          transmission_evidence?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_submissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_confirmation_document_id_fkey"
            columns: ["confirmation_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_district_contact_id_fkey"
            columns: ["district_contact_id"]
            isOneToOne: false
            referencedRelation: "district_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "compliance_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_signature_fk"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          byte_size: number
          created_at: string
          document_id: string
          generated_by: string | null
          id: string
          reason: string | null
          sha256: string
          storage_path: string
          version: number
        }
        Insert: {
          byte_size: number
          created_at?: string
          document_id: string
          generated_by?: string | null
          id?: string
          reason?: string | null
          sha256: string
          storage_path: string
          version: number
        }
        Update: {
          byte_size?: number
          created_at?: string
          document_id?: string
          generated_by?: string | null
          id?: string
          reason?: string | null
          sha256?: string
          storage_path?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          academic_year_id: string | null
          byte_size: number
          category:
            | "assessment"
            | "evaluation"
            | "lesson_plan"
            | "worksheet"
            | "certificate"
            | "report"
            | "receipt"
            | "notice_of_intent"
            | "notice_of_termination"
            | "correspondence"
            | "student_work"
            | "credential"
            | "contract"
            | "incident"
            | "hr_record"
            | "other"
            | "unclassified"
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          document_date: string | null
          family_id: string | null
          id: string
          is_official: boolean
          legal_hold: boolean
          metadata: Json
          mime_type: string
          organization_id: string | null
          original_filename: string
          owner_organization_id: string | null
          page_count: number | null
          record_class:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          retention_until: string | null
          scan_status: "pending" | "clean" | "infected" | "error" | "skipped"
          scanned_at: string | null
          sha256: string
          source: string
          status:
            | "uploaded"
            | "scanning"
            | "quarantined"
            | "clean"
            | "processing"
            | "needs_review"
            | "filed"
            | "failed"
          storage_bucket: string
          storage_path: string
          student_id: string | null
          subject_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          uploaded_by: string | null
          visibility:
            | "family_private"
            | "family_shared"
            | "academic_shared"
            | "assigned_staff"
            | "evaluator_shared"
            | "organization_operational"
            | "system_compliance"
        }
        Insert: {
          academic_year_id?: string | null
          byte_size: number
          category?:
            | "assessment"
            | "evaluation"
            | "lesson_plan"
            | "worksheet"
            | "certificate"
            | "report"
            | "receipt"
            | "notice_of_intent"
            | "notice_of_termination"
            | "correspondence"
            | "student_work"
            | "credential"
            | "contract"
            | "incident"
            | "hr_record"
            | "other"
            | "unclassified"
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_date?: string | null
          family_id?: string | null
          id?: string
          is_official?: boolean
          legal_hold?: boolean
          metadata?: Json
          mime_type: string
          organization_id?: string | null
          original_filename: string
          owner_organization_id?: string | null
          page_count?: number | null
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          retention_until?: string | null
          scan_status?: "pending" | "clean" | "infected" | "error" | "skipped"
          scanned_at?: string | null
          sha256: string
          source?: string
          status?:
            | "uploaded"
            | "scanning"
            | "quarantined"
            | "clean"
            | "processing"
            | "needs_review"
            | "filed"
            | "failed"
          storage_bucket?: string
          storage_path: string
          student_id?: string | null
          subject_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          uploaded_by?: string | null
          visibility?:
            | "family_private"
            | "family_shared"
            | "academic_shared"
            | "assigned_staff"
            | "evaluator_shared"
            | "organization_operational"
            | "system_compliance"
        }
        Update: {
          academic_year_id?: string | null
          byte_size?: number
          category?:
            | "assessment"
            | "evaluation"
            | "lesson_plan"
            | "worksheet"
            | "certificate"
            | "report"
            | "receipt"
            | "notice_of_intent"
            | "notice_of_termination"
            | "correspondence"
            | "student_work"
            | "credential"
            | "contract"
            | "incident"
            | "hr_record"
            | "other"
            | "unclassified"
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_date?: string | null
          family_id?: string | null
          id?: string
          is_official?: boolean
          legal_hold?: boolean
          metadata?: Json
          mime_type?: string
          organization_id?: string | null
          original_filename?: string
          owner_organization_id?: string | null
          page_count?: number | null
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          retention_until?: string | null
          scan_status?: "pending" | "clean" | "infected" | "error" | "skipped"
          scanned_at?: string | null
          sha256?: string
          source?: string
          status?:
            | "uploaded"
            | "scanning"
            | "quarantined"
            | "clean"
            | "processing"
            | "needs_review"
            | "filed"
            | "failed"
          storage_bucket?: string
          storage_path?: string
          student_id?: string | null
          subject_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          uploaded_by?: string | null
          visibility?:
            | "family_private"
            | "family_shared"
            | "academic_shared"
            | "assigned_staff"
            | "evaluator_shared"
            | "organization_operational"
            | "system_compliance"
        }
        Relationships: [
          {
            foreignKeyName: "documents_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_owner_organization_id_fkey"
            columns: ["owner_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          academic_year_id: string | null
          access_grant_id: string | null
          completed_on: string | null
          created_at: string
          created_by: string | null
          credentials_document_id: string | null
          evaluator_email: string | null
          evaluator_profile_id: string | null
          evaluator_signature_id: string | null
          evaluator_user_id: string | null
          family_id: string | null
          fee_cents: number | null
          id: string
          method:
            | "portfolio_review"
            | "standardized_test"
            | "combined"
            | "other"
            | null
          notes: string | null
          organization_id: string | null
          outcome: string | null
          outcome_narrative: string | null
          parent_decision_note: string | null
          parent_reviewed_at: string | null
          parent_reviewed_by: string | null
          report_document_id: string | null
          requested_at: string
          scheduled_for: string | null
          shared_sections: Json
          status:
            | "requested"
            | "accepted"
            | "scheduled"
            | "in_progress"
            | "submitted"
            | "parent_review"
            | "accepted_by_parent"
            | "changes_requested"
            | "declined"
            | "cancelled"
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year_id?: string | null
          access_grant_id?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          credentials_document_id?: string | null
          evaluator_email?: string | null
          evaluator_profile_id?: string | null
          evaluator_signature_id?: string | null
          evaluator_user_id?: string | null
          family_id?: string | null
          fee_cents?: number | null
          id?: string
          method?:
            | "portfolio_review"
            | "standardized_test"
            | "combined"
            | "other"
            | null
          notes?: string | null
          organization_id?: string | null
          outcome?: string | null
          outcome_narrative?: string | null
          parent_decision_note?: string | null
          parent_reviewed_at?: string | null
          parent_reviewed_by?: string | null
          report_document_id?: string | null
          requested_at?: string
          scheduled_for?: string | null
          shared_sections?: Json
          status?:
            | "requested"
            | "accepted"
            | "scheduled"
            | "in_progress"
            | "submitted"
            | "parent_review"
            | "accepted_by_parent"
            | "changes_requested"
            | "declined"
            | "cancelled"
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year_id?: string | null
          access_grant_id?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          credentials_document_id?: string | null
          evaluator_email?: string | null
          evaluator_profile_id?: string | null
          evaluator_signature_id?: string | null
          evaluator_user_id?: string | null
          family_id?: string | null
          fee_cents?: number | null
          id?: string
          method?:
            | "portfolio_review"
            | "standardized_test"
            | "combined"
            | "other"
            | null
          notes?: string | null
          organization_id?: string | null
          outcome?: string | null
          outcome_narrative?: string | null
          parent_decision_note?: string | null
          parent_reviewed_at?: string | null
          parent_reviewed_by?: string | null
          report_document_id?: string | null
          requested_at?: string
          scheduled_for?: string | null
          shared_sections?: Json
          status?:
            | "requested"
            | "accepted"
            | "scheduled"
            | "in_progress"
            | "submitted"
            | "parent_review"
            | "accepted_by_parent"
            | "changes_requested"
            | "declined"
            | "cancelled"
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_access_grant_id_fkey"
            columns: ["access_grant_id"]
            isOneToOne: false
            referencedRelation: "student_access_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_credentials_document_id_fkey"
            columns: ["credentials_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_evaluator_profile_id_fkey"
            columns: ["evaluator_profile_id"]
            isOneToOne: false
            referencedRelation: "evaluator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_evaluator_signature_id_fkey"
            columns: ["evaluator_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_evaluator_user_id_fkey"
            columns: ["evaluator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_parent_reviewed_by_fkey"
            columns: ["parent_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_report_document_id_fkey"
            columns: ["report_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluator_profiles: {
        Row: {
          accepting_new: boolean
          approval_status: string
          availability: Json
          bio: string | null
          created_at: string
          created_by: string | null
          credential_document_id: string | null
          credential_expires_on: string | null
          credential_number: string | null
          credential_type: string | null
          currency: string
          display_name: string
          grade_levels: string[]
          id: string
          languages: string[]
          listed_in_marketplace: boolean
          modality: string
          organization_id: string | null
          price_cents: number | null
          rating_avg: number | null
          rating_count: number
          service_areas: Json
          subject_ids: string[]
          updated_at: string
          updated_by: string | null
          user_id: string
          verification_status:
            | "unverified"
            | "pending"
            | "verified"
            | "rejected"
            | "expired"
          verified_by: string | null
          verified_on: string | null
        }
        Insert: {
          accepting_new?: boolean
          approval_status?: string
          availability?: Json
          bio?: string | null
          created_at?: string
          created_by?: string | null
          credential_document_id?: string | null
          credential_expires_on?: string | null
          credential_number?: string | null
          credential_type?: string | null
          currency?: string
          display_name: string
          grade_levels?: string[]
          id?: string
          languages?: string[]
          listed_in_marketplace?: boolean
          modality?: string
          organization_id?: string | null
          price_cents?: number | null
          rating_avg?: number | null
          rating_count?: number
          service_areas?: Json
          subject_ids?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id: string
          verification_status?:
            | "unverified"
            | "pending"
            | "verified"
            | "rejected"
            | "expired"
          verified_by?: string | null
          verified_on?: string | null
        }
        Update: {
          accepting_new?: boolean
          approval_status?: string
          availability?: Json
          bio?: string | null
          created_at?: string
          created_by?: string | null
          credential_document_id?: string | null
          credential_expires_on?: string | null
          credential_number?: string | null
          credential_type?: string | null
          currency?: string
          display_name?: string
          grade_levels?: string[]
          id?: string
          languages?: string[]
          listed_in_marketplace?: boolean
          modality?: string
          organization_id?: string | null
          price_cents?: number | null
          rating_avg?: number | null
          rating_count?: number
          service_areas?: Json
          subject_ids?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          verification_status?:
            | "unverified"
            | "pending"
            | "verified"
            | "rejected"
            | "expired"
          verified_by?: string | null
          verified_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluator_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluator_profiles_credential_document_id_fkey"
            columns: ["credential_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluator_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluator_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluator_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluator_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluator_reviews: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          evaluation_id: string | null
          evaluator_profile_id: string
          family_id: string
          id: string
          moderated_by: string | null
          rating: number
          status: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          evaluation_id?: string | null
          evaluator_profile_id: string
          family_id: string
          id?: string
          moderated_by?: string | null
          rating: number
          status?: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          evaluation_id?: string | null
          evaluator_profile_id?: string
          family_id?: string
          id?: string
          moderated_by?: string | null
          rating?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluator_reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluator_reviews_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluator_reviews_evaluator_profile_id_fkey"
            columns: ["evaluator_profile_id"]
            isOneToOne: false
            referencedRelation: "evaluator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluator_reviews_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluator_reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          class_id: string | null
          created_at: string
          event_id: string
          id: string
          response: string | null
          role: string
          student_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          response?: string | null
          role?: string
          student_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          response?: string | null
          role?: string
          student_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          attendance_enabled: boolean
          county: string | null
          created_at: string
          created_by: string | null
          default_locale: string
          deleted_at: string | null
          deleted_by: string | null
          homeschool_start_date: string | null
          id: string
          is_independent: boolean
          name: string
          primary_guardian_id: string | null
          settings: Json
          state_code: string | null
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attendance_enabled?: boolean
          county?: string | null
          created_at?: string
          created_by?: string | null
          default_locale?: string
          deleted_at?: string | null
          deleted_by?: string | null
          homeschool_start_date?: string | null
          id?: string
          is_independent?: boolean
          name: string
          primary_guardian_id?: string | null
          settings?: Json
          state_code?: string | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attendance_enabled?: boolean
          county?: string | null
          created_at?: string
          created_by?: string | null
          default_locale?: string
          deleted_at?: string | null
          deleted_by?: string | null
          homeschool_start_date?: string | null
          id?: string
          is_independent?: boolean
          name?: string
          primary_guardian_id?: string | null
          settings?: Json
          state_code?: string | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "families_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_default_locale_fkey"
            columns: ["default_locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "families_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_primary_guardian_id_fkey"
            columns: ["primary_guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          created_by: string | null
          family_id: string
          id: string
          is_primary: boolean
          role: "guardian" | "adult" | "student"
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          family_id: string
          id?: string
          is_primary?: boolean
          role?: "guardian" | "adult" | "student"
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          family_id?: string
          id?: string
          is_primary?: boolean
          role?: "guardian" | "adult" | "student"
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_organization_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          data_sharing: Json
          end_reason: string | null
          ended_on: string | null
          family_id: string
          id: string
          organization_id: string
          started_on: string | null
          status: "pending" | "active" | "paused" | "ended" | "declined"
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_sharing?: Json
          end_reason?: string | null
          ended_on?: string | null
          family_id: string
          id?: string
          organization_id: string
          started_on?: string | null
          status?: "pending" | "active" | "paused" | "ended" | "declined"
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_sharing?: Json
          end_reason?: string | null
          ended_on?: string | null
          family_id?: string
          id?: string
          organization_id?: string
          started_on?: string | null
          status?: "pending" | "active" | "paused" | "ended" | "declined"
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_organization_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_organization_memberships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_organization_memberships_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          action_taken: string | null
          category: string
          class_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          details: string | null
          document_ids: string[]
          id: string
          location_id: string | null
          occurred_at: string
          organization_id: string
          record_class:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          reported_by: string | null
          shared_at: string | null
          shared_with_family: boolean
          status: string
          student_id: string | null
          summary: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action_taken?: string | null
          category: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          details?: string | null
          document_ids?: string[]
          id?: string
          location_id?: string | null
          occurred_at: string
          organization_id: string
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          reported_by?: string | null
          shared_at?: string | null
          shared_with_family?: boolean
          status?: string
          student_id?: string | null
          summary: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action_taken?: string | null
          category?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          details?: string | null
          document_ids?: string[]
          id?: string
          location_id?: string | null
          occurred_at?: string
          organization_id?: string
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          reported_by?: string | null
          shared_at?: string | null
          shared_with_family?: boolean
          status?: string
          student_id?: string | null
          summary?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          family_id: string | null
          id: string
          invite_kind: string
          locale: string
          organization_id: string | null
          payload: Json
          revoked_at: string | null
          role: "org_admin" | "teacher" | "tutor" | "staff" | "evaluator" | null
          student_id: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          family_id?: string | null
          id?: string
          invite_kind?: string
          locale?: string
          organization_id?: string | null
          payload?: Json
          revoked_at?: string | null
          role?:
            | "org_admin"
            | "teacher"
            | "tutor"
            | "staff"
            | "evaluator"
            | null
          student_id?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          family_id?: string | null
          id?: string
          invite_kind?: string
          locale?: string
          organization_id?: string | null
          payload?: Json
          revoked_at?: string | null
          role?:
            | "org_admin"
            | "teacher"
            | "tutor"
            | "staff"
            | "evaluator"
            | null
          student_id?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_family_fk"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_student_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          attempts: number
          created_at: string
          family_id: string | null
          id: string
          idempotency_key: string | null
          kind: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          organization_id: string | null
          payload: Json
          run_after: string
          status: "queued" | "running" | "done" | "failed" | "dead"
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          family_id?: string | null
          id?: string
          idempotency_key?: string | null
          kind: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          organization_id?: string | null
          payload?: Json
          run_after?: string
          status?: "queued" | "running" | "done" | "failed" | "dead"
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          family_id?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          organization_id?: string | null
          payload?: Json
          run_after?: string
          status?: "queued" | "running" | "done" | "failed" | "dead"
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_queue_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_goals: {
        Row: {
          achieved_at: string | null
          ai_generated: boolean
          ai_suggestion_id: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entered_by: string | null
          horizon: "short_term" | "long_term"
          human_confirmed_at: string | null
          human_confirmed_by: string | null
          id: string
          learning_plan_id: string | null
          organization_id: string | null
          priority: number
          progress: number
          skill_id: string | null
          source_id: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          status: "proposed" | "active" | "achieved" | "paused" | "dropped"
          student_id: string
          subject_id: string | null
          target_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          achieved_at?: string | null
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entered_by?: string | null
          horizon?: "short_term" | "long_term"
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          learning_plan_id?: string | null
          organization_id?: string | null
          priority?: number
          progress?: number
          skill_id?: string | null
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          status?: "proposed" | "active" | "achieved" | "paused" | "dropped"
          student_id: string
          subject_id?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          achieved_at?: string | null
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entered_by?: string | null
          horizon?: "short_term" | "long_term"
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          learning_plan_id?: string | null
          organization_id?: string | null
          priority?: number
          progress?: number
          skill_id?: string | null
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          status?: "proposed" | "active" | "achieved" | "paused" | "dropped"
          student_id?: string
          subject_id?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_goals_ai_suggestion_id_fkey"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_goals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_goals_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_goals_human_confirmed_by_fkey"
            columns: ["human_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_goals_learning_plan_id_fkey"
            columns: ["learning_plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_goals_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_goals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_plans: {
        Row: {
          academic_year_id: string | null
          ai_generated: boolean
          ai_recommendations: Json
          ai_suggestion_id: string | null
          approved_at: string | null
          approved_by: string | null
          areas_of_need: string | null
          created_at: string
          created_by: string | null
          current_level: Json
          entered_by: string | null
          family_id: string | null
          human_confirmed_at: string | null
          human_confirmed_by: string | null
          id: string
          learning_preferences: Json
          organization_id: string | null
          parent_goals: string | null
          priority_skill_ids: string[]
          review_on: string | null
          source_id: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          status: "draft" | "active" | "archived"
          strengths: string | null
          student_id: string
          subject_ids: string[]
          supersedes_id: string | null
          teacher_recommendations: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          academic_year_id?: string | null
          ai_generated?: boolean
          ai_recommendations?: Json
          ai_suggestion_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          areas_of_need?: string | null
          created_at?: string
          created_by?: string | null
          current_level?: Json
          entered_by?: string | null
          family_id?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          learning_preferences?: Json
          organization_id?: string | null
          parent_goals?: string | null
          priority_skill_ids?: string[]
          review_on?: string | null
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          status?: "draft" | "active" | "archived"
          strengths?: string | null
          student_id: string
          subject_ids?: string[]
          supersedes_id?: string | null
          teacher_recommendations?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          academic_year_id?: string | null
          ai_generated?: boolean
          ai_recommendations?: Json
          ai_suggestion_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          areas_of_need?: string | null
          created_at?: string
          created_by?: string | null
          current_level?: Json
          entered_by?: string | null
          family_id?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          learning_preferences?: Json
          organization_id?: string | null
          parent_goals?: string | null
          priority_skill_ids?: string[]
          review_on?: string | null
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          status?: "draft" | "active" | "archived"
          strengths?: string | null
          student_id?: string
          subject_ids?: string[]
          supersedes_id?: string | null
          teacher_recommendations?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_plans_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_ai_suggestion_id_fkey"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_human_confirmed_by_fkey"
            columns: ["human_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_groups: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          id: string
          lesson_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_groups_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_groups_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_students: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          lesson_id: string
          notes: string | null
          status: "draft" | "planned" | "in_progress" | "completed" | "archived"
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id: string
          notes?: string | null
          status?:
            | "draft"
            | "planned"
            | "in_progress"
            | "completed"
            | "archived"
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string
          notes?: string | null
          status?:
            | "draft"
            | "planned"
            | "in_progress"
            | "completed"
            | "archived"
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_students_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          academic_year_id: string | null
          ai_generated: boolean
          ai_suggestion_id: string | null
          ai_usage_event_id: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          difficulty: string | null
          duration_minutes: number | null
          entered_by: string | null
          family_id: string | null
          grade_level: string | null
          human_confirmed_at: string | null
          human_confirmed_by: string | null
          id: string
          is_template: boolean
          learning_style: string | null
          locale: string | null
          materials: Json
          objective: string | null
          organization_id: string | null
          portfolio_recommendation: string | null
          scheduled_for: string | null
          sections: Json
          skill_ids: string[]
          source:
            | "manual"
            | "ai_generated"
            | "ai_edited"
            | "template"
            | "duplicated"
            | "import"
          source_id: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          standards: Json
          status: "draft" | "planned" | "in_progress" | "completed" | "archived"
          subject_id: string | null
          template_of_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year_id?: string | null
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          ai_usage_event_id?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          entered_by?: string | null
          family_id?: string | null
          grade_level?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          is_template?: boolean
          learning_style?: string | null
          locale?: string | null
          materials?: Json
          objective?: string | null
          organization_id?: string | null
          portfolio_recommendation?: string | null
          scheduled_for?: string | null
          sections?: Json
          skill_ids?: string[]
          source?:
            | "manual"
            | "ai_generated"
            | "ai_edited"
            | "template"
            | "duplicated"
            | "import"
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          standards?: Json
          status?:
            | "draft"
            | "planned"
            | "in_progress"
            | "completed"
            | "archived"
          subject_id?: string | null
          template_of_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year_id?: string | null
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          ai_usage_event_id?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          entered_by?: string | null
          family_id?: string | null
          grade_level?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          is_template?: boolean
          learning_style?: string | null
          locale?: string | null
          materials?: Json
          objective?: string | null
          organization_id?: string | null
          portfolio_recommendation?: string | null
          scheduled_for?: string | null
          sections?: Json
          skill_ids?: string[]
          source?:
            | "manual"
            | "ai_generated"
            | "ai_edited"
            | "template"
            | "duplicated"
            | "import"
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          standards?: Json
          status?:
            | "draft"
            | "planned"
            | "in_progress"
            | "completed"
            | "archived"
          subject_id?: string | null
          template_of_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_human_confirmed_by_fkey"
            columns: ["human_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "lessons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_suggestion_fk"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_template_of_id_fkey"
            columns: ["template_of_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_usage_fk"
            columns: ["ai_usage_event_id"]
            isOneToOne: false
            referencedRelation: "ai_usage_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_usage_fk"
            columns: ["ai_usage_event_id"]
            isOneToOne: false
            referencedRelation: "ai_usage_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      locales: {
        Row: {
          code: string
          created_at: string
          direction: string
          enabled: boolean
          is_default: boolean
          name: string
          native_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          direction?: string
          enabled?: boolean
          is_default?: boolean
          name: string
          native_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          direction?: string
          enabled?: boolean
          is_default?: boolean
          name?: string
          native_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      message_thread_participants: {
        Row: {
          created_at: string
          id: string
          last_read_at: string | null
          left_at: string | null
          muted: boolean
          role: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_read_at?: string | null
          left_at?: string | null
          muted?: boolean
          role?: string
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_read_at?: string | null
          left_at?: string | null
          muted?: boolean
          role?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_thread_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string | null
          evaluation_id: string | null
          family_id: string | null
          id: string
          last_message_at: string | null
          organization_id: string | null
          status: string
          student_id: string | null
          subject: string | null
          type:
            | "direct"
            | "class"
            | "organization"
            | "evaluation"
            | "support"
            | "announcement"
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          evaluation_id?: string | null
          family_id?: string | null
          id?: string
          last_message_at?: string | null
          organization_id?: string | null
          status?: string
          student_id?: string | null
          subject?: string | null
          type?:
            | "direct"
            | "class"
            | "organization"
            | "evaluation"
            | "support"
            | "announcement"
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          evaluation_id?: string | null
          family_id?: string | null
          id?: string
          last_message_at?: string | null
          organization_id?: string | null
          status?: string
          student_id?: string | null
          subject?: string | null
          type?:
            | "direct"
            | "class"
            | "organization"
            | "evaluation"
            | "support"
            | "announcement"
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          body: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          sender_user_id: string | null
          sent_at: string
          system_kind: string | null
          thread_id: string
        }
        Insert: {
          attachments?: Json
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_user_id?: string | null
          sent_at?: string
          system_kind?: string | null
          thread_id: string
        }
        Update: {
          attachments?: Json
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_user_id?: string | null
          sent_at?: string
          system_kind?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest: "immediate" | "daily" | "weekly" | "off"
          email: boolean
          id: string
          in_app: boolean
          push: boolean
          quiet_hours: Json | null
          type:
            | "upcoming_evaluation"
            | "missing_document"
            | "lesson_reminder"
            | "assignment"
            | "message"
            | "teacher_task"
            | "portfolio_inactivity"
            | "event_change"
            | "class_cancellation"
            | "document_review"
            | "compliance_deadline"
            | "ai_suggestion_ready"
            | "access_granted"
            | "access_revoked"
            | "weekly_report_ready"
            | "system"
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest?: "immediate" | "daily" | "weekly" | "off"
          email?: boolean
          id?: string
          in_app?: boolean
          push?: boolean
          quiet_hours?: Json | null
          type:
            | "upcoming_evaluation"
            | "missing_document"
            | "lesson_reminder"
            | "assignment"
            | "message"
            | "teacher_task"
            | "portfolio_inactivity"
            | "event_change"
            | "class_cancellation"
            | "document_review"
            | "compliance_deadline"
            | "ai_suggestion_ready"
            | "access_granted"
            | "access_revoked"
            | "weekly_report_ready"
            | "system"
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest?: "immediate" | "daily" | "weekly" | "off"
          email?: boolean
          id?: string
          in_app?: boolean
          push?: boolean
          quiet_hours?: Json | null
          type?:
            | "upcoming_evaluation"
            | "missing_document"
            | "lesson_reminder"
            | "assignment"
            | "message"
            | "teacher_task"
            | "portfolio_inactivity"
            | "event_change"
            | "class_cancellation"
            | "document_review"
            | "compliance_deadline"
            | "ai_suggestion_ready"
            | "access_granted"
            | "access_revoked"
            | "weekly_report_ready"
            | "system"
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channels_sent: Json
          created_at: string
          data: Json
          dedupe_key: string | null
          expires_at: string | null
          id: string
          link: string | null
          organization_id: string | null
          priority: number
          read_at: string | null
          student_id: string | null
          title: string
          type:
            | "upcoming_evaluation"
            | "missing_document"
            | "lesson_reminder"
            | "assignment"
            | "message"
            | "teacher_task"
            | "portfolio_inactivity"
            | "event_change"
            | "class_cancellation"
            | "document_review"
            | "compliance_deadline"
            | "ai_suggestion_ready"
            | "access_granted"
            | "access_revoked"
            | "weekly_report_ready"
            | "system"
          user_id: string
        }
        Insert: {
          body?: string | null
          channels_sent?: Json
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          expires_at?: string | null
          id?: string
          link?: string | null
          organization_id?: string | null
          priority?: number
          read_at?: string | null
          student_id?: string | null
          title: string
          type:
            | "upcoming_evaluation"
            | "missing_document"
            | "lesson_reminder"
            | "assignment"
            | "message"
            | "teacher_task"
            | "portfolio_inactivity"
            | "event_change"
            | "class_cancellation"
            | "document_review"
            | "compliance_deadline"
            | "ai_suggestion_ready"
            | "access_granted"
            | "access_revoked"
            | "weekly_report_ready"
            | "system"
          user_id: string
        }
        Update: {
          body?: string | null
          channels_sent?: Json
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          expires_at?: string | null
          id?: string
          link?: string | null
          organization_id?: string | null
          priority?: number
          read_at?: string | null
          student_id?: string | null
          title?: string
          type?:
            | "upcoming_evaluation"
            | "missing_document"
            | "lesson_reminder"
            | "assignment"
            | "message"
            | "teacher_task"
            | "portfolio_inactivity"
            | "event_change"
            | "class_cancellation"
            | "document_review"
            | "compliance_deadline"
            | "ai_suggestion_ready"
            | "access_granted"
            | "access_revoked"
            | "weekly_report_ready"
            | "system"
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_documents: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_id: string
          effective_on: string | null
          expires_on: string | null
          family_id: string | null
          id: string
          kind: string
          organization_id: string
          record_class:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          title: string
          updated_at: string
          updated_by: string | null
          visible_to_family: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id: string
          effective_on?: string | null
          expires_on?: string | null
          family_id?: string | null
          id?: string
          kind: string
          organization_id: string
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          title: string
          updated_at?: string
          updated_by?: string | null
          visible_to_family?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string
          effective_on?: string | null
          expires_on?: string | null
          family_id?: string | null
          id?: string
          kind?: string
          organization_id?: string
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          title?: string
          updated_at?: string
          updated_by?: string | null
          visible_to_family?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "organization_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_locations: {
        Row: {
          active: boolean
          address_line1: string | null
          address_line2: string | null
          capacity: number | null
          city: string | null
          county: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_primary: boolean
          name: string
          organization_id: string
          postal_code: string | null
          state_code: string | null
          timezone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          address_line1?: string | null
          address_line2?: string | null
          capacity?: number | null
          city?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          name: string
          organization_id: string
          postal_code?: string | null
          state_code?: string | null
          timezone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          address_line1?: string | null
          address_line2?: string | null
          capacity?: number | null
          city?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          organization_id?: string
          postal_code?: string | null
          state_code?: string | null
          timezone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_locations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          created_by: string | null
          employment_type: string | null
          ended_on: string | null
          id: string
          invited_by: string | null
          joined_at: string | null
          location_ids: string[]
          organization_id: string
          role: "org_admin" | "teacher" | "tutor" | "staff" | "evaluator"
          started_on: string | null
          status: "invited" | "active" | "suspended" | "removed"
          title: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employment_type?: string | null
          ended_on?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          location_ids?: string[]
          organization_id: string
          role: "org_admin" | "teacher" | "tutor" | "staff" | "evaluator"
          started_on?: string | null
          status?: "invited" | "active" | "suspended" | "removed"
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employment_type?: string | null
          ended_on?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          location_ids?: string[]
          organization_id?: string
          role?: "org_admin" | "teacher" | "tutor" | "staff" | "evaluator"
          started_on?: string | null
          status?: "invited" | "active" | "suspended" | "removed"
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          branding: Json
          compliance_pack_id: string | null
          county: string | null
          created_at: string
          created_by: string | null
          default_locale: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          plan: string
          settings: Json
          slug: string
          state_code: string
          status: string
          supported_locales: string[]
          timezone: string
          type:
            | "microschool"
            | "support_program"
            | "coop"
            | "tutoring"
            | "evaluation_practice"
            | "other"
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branding?: Json
          compliance_pack_id?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          default_locale?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          plan?: string
          settings?: Json
          slug: string
          state_code: string
          status?: string
          supported_locales?: string[]
          timezone?: string
          type?:
            | "microschool"
            | "support_program"
            | "coop"
            | "tutoring"
            | "evaluation_practice"
            | "other"
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branding?: Json
          compliance_pack_id?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          default_locale?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          plan?: string
          settings?: Json
          slug?: string
          state_code?: string
          status?: string
          supported_locales?: string[]
          timezone?: string
          type?:
            | "microschool"
            | "support_program"
            | "coop"
            | "tutoring"
            | "evaluation_practice"
            | "other"
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_compliance_pack_fk"
            columns: ["compliance_pack_id"]
            isOneToOne: false
            referencedRelation: "compliance_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_default_locale_fkey"
            columns: ["default_locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "organizations_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          academic_year_id: string | null
          activity_type:
            | "worksheet"
            | "writing"
            | "project"
            | "experiment"
            | "art"
            | "reading"
            | "video"
            | "photo"
            | "assessment"
            | "field_trip"
            | "discussion"
            | "other"
          ai_generated: boolean
          ai_suggestion_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          document_ids: string[]
          entered_by: string | null
          evidence_category:
            | "work_sample"
            | "assessment"
            | "observation"
            | "teacher_note"
            | "certificate"
            | "reading"
            | "other"
          family_id: string | null
          human_confirmed_at: string | null
          human_confirmed_by: string | null
          id: string
          is_highlight: boolean
          occurred_on: string
          organization_id: string | null
          record_class:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          skill_ids: string[]
          source_id: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id: string
          subject_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          visibility: string
        }
        Insert: {
          academic_year_id?: string | null
          activity_type?:
            | "worksheet"
            | "writing"
            | "project"
            | "experiment"
            | "art"
            | "reading"
            | "video"
            | "photo"
            | "assessment"
            | "field_trip"
            | "discussion"
            | "other"
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_ids?: string[]
          entered_by?: string | null
          evidence_category?:
            | "work_sample"
            | "assessment"
            | "observation"
            | "teacher_note"
            | "certificate"
            | "reading"
            | "other"
          family_id?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          is_highlight?: boolean
          occurred_on?: string
          organization_id?: string | null
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          skill_ids?: string[]
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id: string
          subject_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Update: {
          academic_year_id?: string | null
          activity_type?:
            | "worksheet"
            | "writing"
            | "project"
            | "experiment"
            | "art"
            | "reading"
            | "video"
            | "photo"
            | "assessment"
            | "field_trip"
            | "discussion"
            | "other"
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_ids?: string[]
          entered_by?: string | null
          evidence_category?:
            | "work_sample"
            | "assessment"
            | "observation"
            | "teacher_note"
            | "certificate"
            | "reading"
            | "other"
          family_id?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          is_highlight?: boolean
          occurred_on?: string
          organization_id?: string | null
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          skill_ids?: string[]
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_human_confirmed_by_fkey"
            columns: ["human_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_suggestion_fk"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          deactivated_at: string | null
          email: string
          full_name: string | null
          id: string
          is_super_admin: boolean
          last_seen_at: string | null
          locale: string
          notification_quiet_hours: Json | null
          onboarding_state: Json
          phone: string | null
          preferred_name: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          deactivated_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_super_admin?: boolean
          last_seen_at?: string | null
          locale?: string
          notification_quiet_hours?: Json | null
          onboarding_state?: Json
          phone?: string | null
          preferred_name?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          deactivated_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          last_seen_at?: string | null
          locale?: string
          notification_quiet_hours?: Json | null
          onboarding_state?: Json
          phone?: string | null
          preferred_name?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
        ]
      }
      reading_logs: {
        Row: {
          academic_year_id: string | null
          ai_generated: boolean
          ai_suggestion_id: string | null
          author: string | null
          book_title: string
          chapters: string | null
          completed_on: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          entered_by: string | null
          family_id: string | null
          human_confirmed_at: string | null
          human_confirmed_by: string | null
          id: string
          isbn: string | null
          minutes: number | null
          notes: string | null
          organization_id: string | null
          pages_read: number | null
          rating: number | null
          reading_type: "independent" | "read_aloud" | "shared" | "audiobook"
          skill_ids: string[]
          source_document_id: string | null
          source_id: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          started_on: string | null
          student_id: string
          subject_id: string | null
          total_pages: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year_id?: string | null
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          author?: string | null
          book_title: string
          chapters?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entered_by?: string | null
          family_id?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          isbn?: string | null
          minutes?: number | null
          notes?: string | null
          organization_id?: string | null
          pages_read?: number | null
          rating?: number | null
          reading_type?: "independent" | "read_aloud" | "shared" | "audiobook"
          skill_ids?: string[]
          source_document_id?: string | null
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          started_on?: string | null
          student_id: string
          subject_id?: string | null
          total_pages?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year_id?: string | null
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          author?: string | null
          book_title?: string
          chapters?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entered_by?: string | null
          family_id?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          isbn?: string | null
          minutes?: number | null
          notes?: string | null
          organization_id?: string | null
          pages_read?: number | null
          rating?: number | null
          reading_type?: "independent" | "read_aloud" | "shared" | "audiobook"
          skill_ids?: string[]
          source_document_id?: string | null
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          started_on?: string | null
          student_id?: string
          subject_id?: string | null
          total_pages?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_logs_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_human_confirmed_by_fkey"
            columns: ["human_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_suggestion_fk"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      record_history: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_01: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_02: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_03: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_04: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_05: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_06: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_07: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_08: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_09: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_10: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_11: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2026_12: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_01: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_02: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_03: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_04: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_05: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_06: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_07: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_08: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_09: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_10: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_11: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2027_12: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_01: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_02: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_03: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_04: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_05: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_06: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_07: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_08: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_09: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_10: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_11: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_2028_12: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      record_history_default: {
        Row: {
          ai_suggestion_id: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          family_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: "insert" | "update" | "delete"
          organization_id: string | null
          record_id: string
          source_type: string | null
          student_id: string | null
          table_name: string
        }
        Insert: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id: string
          source_type?: string | null
          student_id?: string | null
          table_name: string
        }
        Update: {
          ai_suggestion_id?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          family_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: "insert" | "update" | "delete"
          organization_id?: string | null
          record_id?: string
          source_type?: string | null
          student_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          academic_year_id: string | null
          created_at: string
          created_by: string | null
          data_snapshot: Json | null
          document_id: string | null
          edited_at: string | null
          edited_by: string | null
          error: string | null
          family_id: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          kind:
            | "student_progress"
            | "portfolio"
            | "activity_log"
            | "reading_log"
            | "attendance"
            | "skill"
            | "learning_plan"
            | "annual_portfolio"
            | "org_student_summary"
            | "teacher_caseload"
            | "compliance_status"
            | "weekly_home_report"
            | "org_daily_brief"
            | "family_data_export"
          locale: string | null
          organization_id: string | null
          parameters: Json
          period_end: string | null
          period_start: string | null
          share_expires_at: string | null
          share_token_hash: string | null
          shared_with: Json
          status: "queued" | "generating" | "ready" | "failed" | "expired"
          student_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          created_by?: string | null
          data_snapshot?: Json | null
          document_id?: string | null
          edited_at?: string | null
          edited_by?: string | null
          error?: string | null
          family_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          kind:
            | "student_progress"
            | "portfolio"
            | "activity_log"
            | "reading_log"
            | "attendance"
            | "skill"
            | "learning_plan"
            | "annual_portfolio"
            | "org_student_summary"
            | "teacher_caseload"
            | "compliance_status"
            | "weekly_home_report"
            | "org_daily_brief"
            | "family_data_export"
          locale?: string | null
          organization_id?: string | null
          parameters?: Json
          period_end?: string | null
          period_start?: string | null
          share_expires_at?: string | null
          share_token_hash?: string | null
          shared_with?: Json
          status?: "queued" | "generating" | "ready" | "failed" | "expired"
          student_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          created_by?: string | null
          data_snapshot?: Json | null
          document_id?: string | null
          edited_at?: string | null
          edited_by?: string | null
          error?: string | null
          family_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          kind?:
            | "student_progress"
            | "portfolio"
            | "activity_log"
            | "reading_log"
            | "attendance"
            | "skill"
            | "learning_plan"
            | "annual_portfolio"
            | "org_student_summary"
            | "teacher_caseload"
            | "compliance_status"
            | "weekly_home_report"
            | "org_daily_brief"
            | "family_data_export"
          locale?: string | null
          organization_id?: string | null
          parameters?: Json
          period_end?: string | null
          period_start?: string | null
          share_expires_at?: string | null
          share_token_hash?: string | null
          shared_with?: Json
          status?: "queued" | "generating" | "ready" | "failed" | "expired"
          student_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          created_at: string
          id: string
          image_path: string | null
          ip: unknown
          method: "typed" | "drawn" | "uploaded" | "provider"
          organization_id: string | null
          payload_hash: string
          signed_at: string
          signer_user_id: string
          statement: string
          subject_id: string
          subject_type: string
          typed_name: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_path?: string | null
          ip?: unknown
          method?: "typed" | "drawn" | "uploaded" | "provider"
          organization_id?: string | null
          payload_hash: string
          signed_at?: string
          signer_user_id: string
          statement: string
          subject_id: string
          subject_type: string
          typed_name?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string | null
          ip?: unknown
          method?: "typed" | "drawn" | "uploaded" | "provider"
          organization_id?: string | null
          payload_hash?: string
          signed_at?: string
          signer_user_id?: string
          statement?: string
          subject_id?: string
          subject_type?: string
          typed_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          active: boolean
          ancestor_ids: string[]
          code: string | null
          created_at: string
          created_by: string | null
          depth: number
          description: string | null
          framework: "internal" | "state_standard" | "common_core" | "custom"
          framework_ref: string | null
          grade_band: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
          parent_skill_id: string | null
          sequence: number
          subject_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          ancestor_ids?: string[]
          code?: string | null
          created_at?: string
          created_by?: string | null
          depth?: number
          description?: string | null
          framework?: "internal" | "state_standard" | "common_core" | "custom"
          framework_ref?: string | null
          grade_band?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id?: string | null
          parent_skill_id?: string | null
          sequence?: number
          subject_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          ancestor_ids?: string[]
          code?: string | null
          created_at?: string
          created_by?: string | null
          depth?: number
          description?: string | null
          framework?: "internal" | "state_standard" | "common_core" | "custom"
          framework_ref?: string | null
          grade_band?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
          parent_skill_id?: string | null
          sequence?: number
          subject_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_parent_skill_id_fkey"
            columns: ["parent_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_records: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_id: string | null
          effective_on: string | null
          expires_on: string | null
          id: string
          kind: string
          notes: string | null
          organization_id: string
          record_class:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string | null
          effective_on?: string | null
          expires_on?: string | null
          id?: string
          kind: string
          notes?: string | null
          organization_id: string
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string | null
          effective_on?: string | null
          expires_on?: string | null
          id?: string
          kind?: string
          notes?: string | null
          organization_id?: string
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_records_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_access_grants: {
        Row: {
          access_level: "none" | "read" | "write" | "admin"
          consent_id: string | null
          created_at: string
          expires_at: string
          granted_at: string
          granted_by: string
          grantee_email: string | null
          grantee_user_id: string | null
          id: string
          kind: "evaluation" | "review" | "transfer" | "support" | "provider"
          revoked_at: string | null
          revoked_by: string | null
          sections: (
            | "student_profile"
            | "academic_record"
            | "portfolio"
            | "activity_log"
            | "reading_log"
            | "assignment"
            | "assessment"
            | "skill"
            | "learning_plan"
            | "attendance"
            | "calendar"
            | "teacher_note"
            | "teacher_note_private"
            | "document"
            | "compliance"
            | "compliance_submission"
            | "evaluation"
            | "evaluator_review"
            | "consent"
            | "guardian"
            | "access_grant"
            | "organization_enrollment"
            | "communication"
            | "report"
            | "incident"
            | "audit"
          )[]
          status: "pending" | "active" | "revoked" | "expired"
          student_id: string
          token_hash: string | null
          updated_at: string
        }
        Insert: {
          access_level?: "none" | "read" | "write" | "admin"
          consent_id?: string | null
          created_at?: string
          expires_at: string
          granted_at?: string
          granted_by: string
          grantee_email?: string | null
          grantee_user_id?: string | null
          id?: string
          kind: "evaluation" | "review" | "transfer" | "support" | "provider"
          revoked_at?: string | null
          revoked_by?: string | null
          sections?: (
            | "student_profile"
            | "academic_record"
            | "portfolio"
            | "activity_log"
            | "reading_log"
            | "assignment"
            | "assessment"
            | "skill"
            | "learning_plan"
            | "attendance"
            | "calendar"
            | "teacher_note"
            | "teacher_note_private"
            | "document"
            | "compliance"
            | "compliance_submission"
            | "evaluation"
            | "evaluator_review"
            | "consent"
            | "guardian"
            | "access_grant"
            | "organization_enrollment"
            | "communication"
            | "report"
            | "incident"
            | "audit"
          )[]
          status?: "pending" | "active" | "revoked" | "expired"
          student_id: string
          token_hash?: string | null
          updated_at?: string
        }
        Update: {
          access_level?: "none" | "read" | "write" | "admin"
          consent_id?: string | null
          created_at?: string
          expires_at?: string
          granted_at?: string
          granted_by?: string
          grantee_email?: string | null
          grantee_user_id?: string | null
          id?: string
          kind?: "evaluation" | "review" | "transfer" | "support" | "provider"
          revoked_at?: string | null
          revoked_by?: string | null
          sections?: (
            | "student_profile"
            | "academic_record"
            | "portfolio"
            | "activity_log"
            | "reading_log"
            | "assignment"
            | "assessment"
            | "skill"
            | "learning_plan"
            | "attendance"
            | "calendar"
            | "teacher_note"
            | "teacher_note_private"
            | "document"
            | "compliance"
            | "compliance_submission"
            | "evaluation"
            | "evaluator_review"
            | "consent"
            | "guardian"
            | "access_grant"
            | "organization_enrollment"
            | "communication"
            | "report"
            | "incident"
            | "audit"
          )[]
          status?: "pending" | "active" | "revoked" | "expired"
          student_id?: string
          token_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_access_grants_consent_fk"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_access_grants_consent_fk"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "current_consents"
            referencedColumns: ["consent_id"]
          },
          {
            foreignKeyName: "student_access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_access_grants_grantee_user_id_fkey"
            columns: ["grantee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_access_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_access_grants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_compliance_records: {
        Row: {
          academic_year_id: string | null
          by_category: Json
          computed_at: string
          county: string | null
          created_at: string
          id: string
          next_due_on: string | null
          next_due_rule_id: string | null
          open_items: number
          organization_id: string | null
          overall_status:
            | "current"
            | "upcoming"
            | "needs_attention"
            | "incomplete"
            | "overdue"
            | "not_applicable"
            | "unknown"
          pack_id: string | null
          state_code: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          by_category?: Json
          computed_at?: string
          county?: string | null
          created_at?: string
          id?: string
          next_due_on?: string | null
          next_due_rule_id?: string | null
          open_items?: number
          organization_id?: string | null
          overall_status?:
            | "current"
            | "upcoming"
            | "needs_attention"
            | "incomplete"
            | "overdue"
            | "not_applicable"
            | "unknown"
          pack_id?: string | null
          state_code?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          by_category?: Json
          computed_at?: string
          county?: string | null
          created_at?: string
          id?: string
          next_due_on?: string | null
          next_due_rule_id?: string | null
          open_items?: number
          organization_id?: string | null
          overall_status?:
            | "current"
            | "upcoming"
            | "needs_attention"
            | "incomplete"
            | "overdue"
            | "not_applicable"
            | "unknown"
          pack_id?: string | null
          state_code?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_compliance_records_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_compliance_records_next_due_rule_id_fkey"
            columns: ["next_due_rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_compliance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_compliance_records_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "compliance_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_compliance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          access_level: "view_only" | "standard" | "full"
          created_at: string
          created_by: string | null
          granted_at: string
          granted_by: string | null
          household: string | null
          id: string
          is_emergency_contact: boolean
          is_primary: boolean
          relationship: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          student_id: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          access_level?: "view_only" | "standard" | "full"
          created_at?: string
          created_by?: string | null
          granted_at?: string
          granted_by?: string | null
          household?: string | null
          id?: string
          is_emergency_contact?: boolean
          is_primary?: boolean
          relationship?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          student_id: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          access_level?: "view_only" | "standard" | "full"
          created_at?: string
          created_by?: string | null
          granted_at?: string
          granted_by?: string | null
          household?: string | null
          id?: string
          is_emergency_contact?: boolean
          is_primary?: boolean
          relationship?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          student_id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_organization_memberships: {
        Row: {
          academic_year_id: string | null
          created_at: string
          created_by: string | null
          data_sharing: Json
          end_date: string | null
          end_reason: string | null
          enrollment_type:
            | "full_time"
            | "part_time"
            | "program"
            | "tutoring"
            | "evaluation_only"
            | "umbrella"
            | "other"
          id: string
          location_id: string | null
          notes: string | null
          organization_id: string
          start_date: string | null
          status: "pending" | "active" | "paused" | "ended" | "declined"
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          created_by?: string | null
          data_sharing?: Json
          end_date?: string | null
          end_reason?: string | null
          enrollment_type?:
            | "full_time"
            | "part_time"
            | "program"
            | "tutoring"
            | "evaluation_only"
            | "umbrella"
            | "other"
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id: string
          start_date?: string | null
          status?: "pending" | "active" | "paused" | "ended" | "declined"
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          created_by?: string | null
          data_sharing?: Json
          end_date?: string | null
          end_reason?: string | null
          enrollment_type?:
            | "full_time"
            | "part_time"
            | "program"
            | "tutoring"
            | "evaluation_only"
            | "umbrella"
            | "other"
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          start_date?: string | null
          status?: "pending" | "active" | "paused" | "ended" | "declined"
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "som_academic_year_fk"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_organization_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_organization_memberships_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_organization_memberships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_organization_memberships_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_skill_events: {
        Row: {
          ai_generated: boolean
          ai_suggestion_id: string | null
          confidence:
            | "ai_suggested"
            | "self_reported"
            | "parent_reported"
            | "teacher_observed"
            | "assessment_confirmed"
          created_at: string
          created_by: string | null
          delta: number | null
          entered_by: string | null
          evidence_note: string | null
          human_confirmed_at: string | null
          human_confirmed_by: string | null
          id: string
          mastery_level:
            | "not_started"
            | "introduced"
            | "developing"
            | "progressing"
            | "proficient"
            | "mastered"
            | null
          occurred_on: string
          organization_id: string | null
          score: number | null
          skill_id: string
          source_id: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id: string
          student_skill_id: string
        }
        Insert: {
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          confidence:
            | "ai_suggested"
            | "self_reported"
            | "parent_reported"
            | "teacher_observed"
            | "assessment_confirmed"
          created_at?: string
          created_by?: string | null
          delta?: number | null
          entered_by?: string | null
          evidence_note?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          mastery_level?:
            | "not_started"
            | "introduced"
            | "developing"
            | "progressing"
            | "proficient"
            | "mastered"
            | null
          occurred_on?: string
          organization_id?: string | null
          score?: number | null
          skill_id: string
          source_id?: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id: string
          student_skill_id: string
        }
        Update: {
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          confidence?:
            | "ai_suggested"
            | "self_reported"
            | "parent_reported"
            | "teacher_observed"
            | "assessment_confirmed"
          created_at?: string
          created_by?: string | null
          delta?: number | null
          entered_by?: string | null
          evidence_note?: string | null
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          mastery_level?:
            | "not_started"
            | "introduced"
            | "developing"
            | "progressing"
            | "proficient"
            | "mastered"
            | null
          occurred_on?: string
          organization_id?: string | null
          score?: number | null
          skill_id?: string
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id?: string
          student_skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sse_suggestion_fk"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skill_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skill_events_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skill_events_human_confirmed_by_fkey"
            columns: ["human_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skill_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skill_events_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skill_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skill_events_student_skill_id_fkey"
            columns: ["student_skill_id"]
            isOneToOne: false
            referencedRelation: "student_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      student_skills: {
        Row: {
          ai_generated: boolean
          ai_suggestion_id: string | null
          confidence:
            | "ai_suggested"
            | "self_reported"
            | "parent_reported"
            | "teacher_observed"
            | "assessment_confirmed"
          created_at: string
          created_by: string | null
          entered_by: string | null
          evidence_count: number
          human_confirmed_at: string | null
          human_confirmed_by: string | null
          id: string
          last_evidence_at: string | null
          mastery_level:
            | "not_started"
            | "introduced"
            | "developing"
            | "progressing"
            | "proficient"
            | "mastered"
          notes: string | null
          organization_id: string | null
          score: number | null
          skill_id: string
          source_id: string | null
          source_type:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          confidence?:
            | "ai_suggested"
            | "self_reported"
            | "parent_reported"
            | "teacher_observed"
            | "assessment_confirmed"
          created_at?: string
          created_by?: string | null
          entered_by?: string | null
          evidence_count?: number
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          last_evidence_at?: string | null
          mastery_level?:
            | "not_started"
            | "introduced"
            | "developing"
            | "progressing"
            | "proficient"
            | "mastered"
          notes?: string | null
          organization_id?: string | null
          score?: number | null
          skill_id: string
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_generated?: boolean
          ai_suggestion_id?: string | null
          confidence?:
            | "ai_suggested"
            | "self_reported"
            | "parent_reported"
            | "teacher_observed"
            | "assessment_confirmed"
          created_at?: string
          created_by?: string | null
          entered_by?: string | null
          evidence_count?: number
          human_confirmed_at?: string | null
          human_confirmed_by?: string | null
          id?: string
          last_evidence_at?: string | null
          mastery_level?:
            | "not_started"
            | "introduced"
            | "developing"
            | "progressing"
            | "proficient"
            | "mastered"
          notes?: string | null
          organization_id?: string | null
          score?: number | null
          skill_id?: string
          source_id?: string | null
          source_type?:
            | "parent"
            | "teacher"
            | "tutor"
            | "evaluator"
            | "student"
            | "org_admin"
            | "assessment"
            | "portfolio_evidence"
            | "assignment"
            | "observation"
            | "document_extraction"
            | "ai_suggestion"
            | "system_calculation"
            | "import"
            | "manual"
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_skills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_human_confirmed_by_fkey"
            columns: ["human_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_suggestion_fk"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_staff_assignments: {
        Row: {
          access_level: "none" | "read" | "write" | "admin"
          active: boolean
          created_at: string
          created_by: string | null
          ends_on: string | null
          granted_by: string | null
          id: string
          organization_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: "teacher" | "tutor" | "specialist" | "case_manager"
          starts_on: string | null
          student_id: string
          subject_ids: string[]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          access_level?: "none" | "read" | "write" | "admin"
          active?: boolean
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          granted_by?: string | null
          id?: string
          organization_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: "teacher" | "tutor" | "specialist" | "case_manager"
          starts_on?: string | null
          student_id: string
          subject_ids?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          access_level?: "none" | "read" | "write" | "admin"
          active?: boolean
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          granted_by?: string | null
          id?: string
          organization_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: "teacher" | "tutor" | "specialist" | "case_manager"
          starts_on?: string | null
          student_id?: string
          subject_ids?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_staff_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_staff_assignments_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_staff_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_staff_assignments_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_staff_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_staff_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_staff_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          archived_at: string | null
          county: string | null
          created_at: string
          created_by: string | null
          current_academic_year_id: string | null
          date_of_birth: string
          deleted_at: string | null
          deleted_by: string | null
          family_id: string
          goals: string | null
          grade_equivalent: Json
          grade_level: string | null
          homeschool_start_date: string | null
          id: string
          learning_preferences: Json
          legal_first_name: string
          legal_last_name: string
          legal_middle_name: string | null
          locale: string | null
          photo_path: string | null
          preferred_name: string | null
          primary_organization_id: string | null
          state_code: string | null
          status: "active" | "inactive" | "graduated" | "withdrawn"
          support_needs: Json
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          current_academic_year_id?: string | null
          date_of_birth: string
          deleted_at?: string | null
          deleted_by?: string | null
          family_id: string
          goals?: string | null
          grade_equivalent?: Json
          grade_level?: string | null
          homeschool_start_date?: string | null
          id?: string
          learning_preferences?: Json
          legal_first_name: string
          legal_last_name: string
          legal_middle_name?: string | null
          locale?: string | null
          photo_path?: string | null
          preferred_name?: string | null
          primary_organization_id?: string | null
          state_code?: string | null
          status?: "active" | "inactive" | "graduated" | "withdrawn"
          support_needs?: Json
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          current_academic_year_id?: string | null
          date_of_birth?: string
          deleted_at?: string | null
          deleted_by?: string | null
          family_id?: string
          goals?: string | null
          grade_equivalent?: Json
          grade_level?: string | null
          homeschool_start_date?: string | null
          id?: string
          learning_preferences?: Json
          legal_first_name?: string
          legal_last_name?: string
          legal_middle_name?: string | null
          locale?: string | null
          photo_path?: string | null
          preferred_name?: string | null
          primary_organization_id?: string | null
          state_code?: string | null
          status?: "active" | "inactive" | "graduated" | "withdrawn"
          support_needs?: Json
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_academic_year_fk"
            columns: ["current_academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "students_primary_organization_id_fkey"
            columns: ["primary_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          active: boolean
          category: string | null
          color: string | null
          created_at: string
          created_by: string | null
          family_id: string | null
          icon: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
          sequence: number
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          family_id?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id?: string | null
          sequence?: number
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          family_id?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
          sequence?: number
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_access_sessions: {
        Row: {
          approved_by: string | null
          closed_at: string | null
          created_at: string
          expires_at: string
          id: string
          organization_id: string | null
          reason: string
          started_at: string
          student_id: string | null
          ticket_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          closed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          organization_id?: string | null
          reason: string
          started_at?: string
          student_id?: string | null
          ticket_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          closed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string | null
          reason?: string
          started_at?: string
          student_id?: string | null
          ticket_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_access_sessions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_access_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_access_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_access_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_notes: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          occurred_on: string
          organization_id: string | null
          record_class:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          student_id: string
          subject_id: string | null
          tags: string[]
          updated_at: string
          updated_by: string | null
          visibility: "private_to_author" | "staff" | "family" | "all"
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          occurred_on?: string
          organization_id?: string | null
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          student_id: string
          subject_id?: string | null
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          visibility?: "private_to_author" | "staff" | "family" | "all"
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          occurred_on?: string
          organization_id?: string | null
          record_class?:
            | "student_educational"
            | "organization_operational"
            | "shared"
            | "platform"
          student_id?: string
          subject_id?: string | null
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          visibility?: "private_to_author" | "staff" | "family" | "all"
        }
        Relationships: [
          {
            foreignKeyName: "teacher_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          effect: string
          expires_at: string | null
          granted_by: string | null
          id: string
          permission: string
          reason: string | null
          scope_id: string
          scope_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effect?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          permission: string
          reason?: string | null
          scope_id: string
          scope_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          effect?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: string
          reason?: string | null
          scope_id?: string
          scope_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_usage_summary: {
        Row: {
          cached_tokens: number | null
          created_at: string | null
          estimated_cost_usd: number | null
          family_id: string | null
          feature:
            | "document_classification"
            | "document_extraction"
            | "worksheet_analysis"
            | "lesson_generation"
            | "weekly_report"
            | "assistant"
            | "skill_analysis"
            | "portfolio_description"
            | "progress_analysis"
            | "daily_brief"
            | "translation"
            | null
          id: string | null
          input_tokens: number | null
          latency_ms: number | null
          organization_id: string | null
          output_tokens: number | null
          status:
            | "success"
            | "error"
            | "timeout"
            | "refused"
            | "rate_limited"
            | "budget_blocked"
            | null
          student_id: string | null
        }
        Insert: {
          cached_tokens?: number | null
          created_at?: string | null
          estimated_cost_usd?: number | null
          family_id?: string | null
          feature?:
            | "document_classification"
            | "document_extraction"
            | "worksheet_analysis"
            | "lesson_generation"
            | "weekly_report"
            | "assistant"
            | "skill_analysis"
            | "portfolio_description"
            | "progress_analysis"
            | "daily_brief"
            | "translation"
            | null
          id?: string | null
          input_tokens?: number | null
          latency_ms?: number | null
          organization_id?: string | null
          output_tokens?: number | null
          status?:
            | "success"
            | "error"
            | "timeout"
            | "refused"
            | "rate_limited"
            | "budget_blocked"
            | null
          student_id?: string | null
        }
        Update: {
          cached_tokens?: number | null
          created_at?: string | null
          estimated_cost_usd?: number | null
          family_id?: string | null
          feature?:
            | "document_classification"
            | "document_extraction"
            | "worksheet_analysis"
            | "lesson_generation"
            | "weekly_report"
            | "assistant"
            | "skill_analysis"
            | "portfolio_description"
            | "progress_analysis"
            | "daily_brief"
            | "translation"
            | null
          id?: string | null
          input_tokens?: number | null
          latency_ms?: number | null
          organization_id?: string | null
          output_tokens?: number | null
          status?:
            | "success"
            | "error"
            | "timeout"
            | "refused"
            | "rate_limited"
            | "budget_blocked"
            | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      current_consents: {
        Row: {
          consent_id: string | null
          consent_policy_id: string | null
          consent_type:
            | "guardian_relationship"
            | "student_account"
            | "ai_document_processing"
            | "ai_academic_analysis"
            | "evaluator_access"
            | "provider_access"
            | "photo_media_use"
            | "communication"
            | "organization_data_sharing"
            | "electronic_signature"
            | "directory_listing"
            | "research_participation"
            | null
          created_at: string | null
          document_version: string | null
          family_id: string | null
          granted: boolean | null
          granted_at: string | null
          guardian_id: string | null
          method:
            | "web_checkbox"
            | "web_signature"
            | "uploaded_document"
            | "verbal_recorded"
            | "email_confirmation"
            | "import"
            | null
          organization_id: string | null
          policy_version: string | null
          revoked_at: string | null
          scope: Json | null
          subject_student_id: string | null
          subject_user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_consent_policy_id_fkey"
            columns: ["consent_policy_id"]
            isOneToOne: false
            referencedRelation: "consent_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_subject_student_id_fkey"
            columns: ["subject_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
