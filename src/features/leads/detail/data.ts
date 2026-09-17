import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function getLead(supabase: Client, id: string) {
  const { data } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getLeadActivities(supabase: Client, leadId: string) {
  const { data } = await supabase
    .from("lead_activities")
    .select("id, actor_id, activity_type, description, metadata, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getLeadTasks(supabase: Client, leadId: string) {
  const { data } = await supabase
    .from("tasks")
    .select("id, title, task_type, due_at, status, assigned_to, completed_at, created_at")
    .eq("lead_id", leadId)
    .order("due_at", { ascending: true });
  return data ?? [];
}
