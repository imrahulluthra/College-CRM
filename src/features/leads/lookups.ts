import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

// Small, staff-readable tables. Fetched in full and turned into id -> row
// maps rather than relying on supabase-js's embedded-resource typing (which
// needs a full generated Relationships graph we don't hand-maintain here) --
// see src/types/database.ts.

export async function getActivePrograms(supabase: Client) {
  const { data } = await supabase
    .from("programs")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getLeadSourceOptions(supabase: Client) {
  const { data } = await supabase
    .from("lead_sources")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getCounselors(supabase: Client) {
  const [{ data: roleRows }, { data: profiles }] = await Promise.all([
    supabase.from("user_roles").select("user_id").eq("role", "counselor"),
    supabase.from("profiles").select("id, full_name").eq("is_active", true),
  ]);

  const counselorIds = new Set((roleRows ?? []).map((r) => r.user_id));
  return (profiles ?? []).filter((p) => counselorIds.has(p.id));
}

export async function getProgramsMap(supabase: Client) {
  const programs = await getActivePrograms(supabase);
  return new Map(programs.map((p) => [p.id, p]));
}

export async function getLeadSourcesMap(supabase: Client) {
  const sources = await getLeadSourceOptions(supabase);
  return new Map(sources.map((s) => [s.id, s]));
}

export async function getProfilesMap(supabase: Client) {
  const { data } = await supabase.from("profiles").select("id, full_name, email");
  return new Map((data ?? []).map((p) => [p.id, p]));
}
