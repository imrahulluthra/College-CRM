import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

// One application per student login. RLS already scopes to the caller, but we
// filter by student_user_id too for clarity.
export async function getMyApplication(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("student_user_id", userId)
    .maybeSingle();
  return data;
}

export async function getMyProfile(supabase: Client, applicationId: string) {
  const { data } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();
  return data;
}

export async function getMyPayment(supabase: Client, applicationId: string) {
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })
    .maybeSingle();
  return data;
}

/** Required + optional document types joined with the student's uploads. */
export async function getMyDocuments(supabase: Client, applicationId: string) {
  const [{ data: types }, { data: docs }] = await Promise.all([
    supabase
      .from("document_types")
      .select("id, name, is_required, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("student_documents")
      .select("id, document_type_id, file_name, status, rejection_reason, uploaded_at")
      .eq("application_id", applicationId),
  ]);

  const byType = new Map((docs ?? []).map((d) => [d.document_type_id, d]));
  return (types ?? []).map((t) => ({ type: t, doc: byType.get(t.id) ?? null }));
}

const PROFILE_FIELDS: (keyof NonNullable<Awaited<ReturnType<typeof getMyProfile>>>)[] = [
  "date_of_birth",
  "gender",
  "address",
  "city",
  "state",
  "guardian_name",
  "guardian_phone",
  "tenth_percentage",
  "twelfth_percentage",
  "graduation_percentage",
];

export function profileComplete(profile: Awaited<ReturnType<typeof getMyProfile>>) {
  if (!profile) return false;
  return PROFILE_FIELDS.every((f) => profile[f] != null && profile[f] !== "");
}
