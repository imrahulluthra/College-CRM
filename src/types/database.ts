// Hand-written to match supabase/migrations/*.sql. Phase 1 tables/views only --
// extend this (and the matching migration) when Phase 2/3/4 add tables.
// Regenerate against a live project instead once one exists:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
//
// `Relationships: []` on every table/view and the empty `Functions` /
// `Enums` / `CompositeTypes` records are required shape, not real data --
// @supabase/postgrest-js's GenericSchema constraint needs them present or
// every table's Row/Insert/Update silently collapses to `never`.

export type UserRole =
  | "super_admin"
  | "admissions_manager"
  | "counselor"
  | "document_reviewer"
  | "student";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "COUNSELLING"
  | "APPLICATION_STARTED"
  | "DOCUMENTS_PENDING"
  | "APPLICATION_COMPLETE"
  | "OFFER_SENT"
  | "FEE_PENDING"
  | "ADMITTED"
  | "ENROLLED"
  | "NOT_INTERESTED"
  | "UNQUALIFIED"
  | "WRONG_NUMBER"
  | "DUPLICATE"
  | "LOST"
  | "NURTURE";

export type LeadActivityType =
  | "created"
  | "duplicate_submission"
  | "status_changed"
  | "assigned"
  | "reassigned"
  | "note"
  | "call"
  | "email"
  | "whatsapp"
  | "task_created"
  | "task_completed"
  | "task_cancelled"
  | "application_link_sent";

export type TaskType =
  | "call"
  | "follow_up"
  | "meeting"
  | "document_reminder"
  | "application_reminder"
  | "other";

export type TaskStatus = "pending" | "completed" | "cancelled";

export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "FEE_PENDING"
  | "ADMITTED"
  | "ENROLLED"
  | "REJECTED"
  | "WITHDRAWN";

export type DocumentStatus = "UPLOADED" | "APPROVED" | "REJECTED";

export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          full_name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_roles"]["Row"]> & {
          user_id: string;
          role: UserRole;
        };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Row"]>;
        Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          name: string;
          slug: string;
          degree_level: string | null;
          duration_months: number | null;
          description: string | null;
          fee_amount: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["programs"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["programs"]["Row"]>;
        Relationships: [];
      };
      admission_cycles: {
        Row: {
          id: string;
          program_id: string;
          name: string;
          start_date: string | null;
          end_date: string | null;
          application_deadline: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["admission_cycles"]["Row"]> & {
          program_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["admission_cycles"]["Row"]>;
        Relationships: [];
      };
      lead_sources: {
        Row: {
          id: string;
          name: string;
          category: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lead_sources"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_sources"]["Row"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          phone_normalized: string;
          email: string | null;
          city: string | null;
          state: string | null;
          program_id: string | null;
          admission_cycle_id: string | null;
          source_id: string | null;
          campaign: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          landing_page: string | null;
          status: LeadStatus;
          assigned_counselor_id: string | null;
          last_activity_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["leads"]["Row"]> & {
          full_name: string;
          phone: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>;
        Relationships: [];
      };
      lead_activities: {
        Row: {
          id: string;
          lead_id: string;
          actor_id: string | null;
          activity_type: LeadActivityType;
          description: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lead_activities"]["Row"]> & {
          lead_id: string;
          activity_type: LeadActivityType;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_activities"]["Row"]>;
        Relationships: [];
      };
      lead_status_history: {
        Row: {
          id: string;
          lead_id: string;
          from_status: LeadStatus | null;
          to_status: LeadStatus;
          changed_by: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lead_status_history"]["Row"]> & {
          lead_id: string;
          to_status: LeadStatus;
        };
        Update: Partial<Database["public"]["Tables"]["lead_status_history"]["Row"]>;
        Relationships: [];
      };
      lead_assignments: {
        Row: {
          id: string;
          lead_id: string;
          counselor_id: string;
          assigned_by: string | null;
          assigned_at: string;
          unassigned_at: string | null;
          reason: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["lead_assignments"]["Row"]> & {
          lead_id: string;
          counselor_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_assignments"]["Row"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          lead_id: string | null;
          title: string;
          description: string | null;
          task_type: TaskType;
          due_at: string;
          assigned_to: string;
          status: TaskStatus;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          title: string;
          due_at: string;
          assigned_to: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          previous_value: Record<string, unknown> | null;
          new_value: Record<string, unknown> | null;
          context: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          action: string;
          entity_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          is_active: boolean;
          created_by: string | null;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["api_keys"]["Row"]> & {
          name: string;
          key_hash: string;
          key_prefix: string;
        };
        Update: Partial<Database["public"]["Tables"]["api_keys"]["Row"]>;
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          lead_id: string;
          student_user_id: string | null;
          program_id: string | null;
          admission_cycle_id: string | null;
          status: ApplicationStatus;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["applications"]["Row"]> & {
          lead_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Row"]>;
        Relationships: [];
      };
      student_profiles: {
        Row: {
          application_id: string;
          date_of_birth: string | null;
          gender: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          guardian_name: string | null;
          guardian_phone: string | null;
          tenth_percentage: number | null;
          twelfth_percentage: number | null;
          graduation_percentage: number | null;
          entrance_exam: string | null;
          entrance_score: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["student_profiles"]["Row"]> & {
          application_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_profiles"]["Row"]>;
        Relationships: [];
      };
      document_types: {
        Row: {
          id: string;
          name: string;
          is_required: boolean;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["document_types"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_types"]["Row"]>;
        Relationships: [];
      };
      student_documents: {
        Row: {
          id: string;
          application_id: string;
          document_type_id: string;
          storage_path: string;
          file_name: string;
          status: DocumentStatus;
          rejection_reason: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          uploaded_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["student_documents"]["Row"]> & {
          application_id: string;
          document_type_id: string;
          storage_path: string;
          file_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_documents"]["Row"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          application_id: string;
          label: string;
          amount_total: number;
          amount_paid: number;
          status: PaymentStatus;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & {
          application_id: string;
          amount_total: number;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      lead_funnel_counts: {
        Row: { status: LeadStatus; lead_count: number };
        Relationships: [];
      };
      lead_source_counts: {
        Row: { source_name: string; lead_count: number };
        Relationships: [];
      };
      counselor_workload: {
        Row: {
          counselor_id: string;
          full_name: string;
          assigned_leads: number;
          pending_leads: number;
          applications: number;
          pending_tasks: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      lead_status: LeadStatus;
      lead_activity_type: LeadActivityType;
      task_type: TaskType;
      task_status: TaskStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
