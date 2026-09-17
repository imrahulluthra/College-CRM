import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, LeadStatus } from "@/types/database";

type Client = SupabaseClient<Database>;

const APPLICATION_STAGE_STATUSES: LeadStatus[] = [
  "APPLICATION_STARTED",
  "DOCUMENTS_PENDING",
  "APPLICATION_COMPLETE",
  "OFFER_SENT",
  "FEE_PENDING",
];

async function countLeadsWithStatus(supabase: Client, statuses?: LeadStatus[]) {
  let query = supabase.from("leads").select("*", { count: "exact", head: true });
  if (statuses) query = query.in("status", statuses);
  const { count } = await query;
  return count ?? 0;
}

async function countLeadsCreatedSince(supabase: Client, since: string) {
  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);
  return count ?? 0;
}

export async function getKpis(supabase: Client) {
  const [total, newLeads, contacted, interested, applications, admitted, enrolled] =
    await Promise.all([
      countLeadsWithStatus(supabase),
      countLeadsWithStatus(supabase, ["NEW"]),
      countLeadsWithStatus(supabase, ["CONTACTED"]),
      countLeadsWithStatus(supabase, ["INTERESTED"]),
      countLeadsWithStatus(supabase, APPLICATION_STAGE_STATUSES),
      countLeadsWithStatus(supabase, ["ADMITTED"]),
      countLeadsWithStatus(supabase, ["ENROLLED"]),
    ]);

  return { total, newLeads, contacted, interested, applications, admitted, enrolled };
}

const FUNNEL_STAGES: { status: LeadStatus; label: string }[] = [
  { status: "NEW", label: "Lead" },
  { status: "CONTACTED", label: "Contacted" },
  { status: "INTERESTED", label: "Interested" },
  { status: "APPLICATION_STARTED", label: "Application Started" },
  { status: "DOCUMENTS_PENDING", label: "Documents Pending" },
  { status: "ADMITTED", label: "Admission" },
  { status: "ENROLLED", label: "Enrolled" },
];

export async function getFunnel(supabase: Client) {
  const { data } = await supabase.from("lead_funnel_counts").select("status, lead_count");
  const counts = new Map((data ?? []).map((r) => [r.status, r.lead_count]));

  return FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: counts.get(stage.status) ?? 0,
  }));
}

export async function getLeadSources(supabase: Client) {
  const { data } = await supabase
    .from("lead_source_counts")
    .select("source_name, lead_count")
    .order("lead_count", { ascending: false });
  return data ?? [];
}

export async function getCounselorWorkload(supabase: Client) {
  const { data } = await supabase
    .from("counselor_workload")
    .select("counselor_id, full_name, assigned_leads, pending_leads, applications, pending_tasks")
    .order("assigned_leads", { ascending: false });
  return data ?? [];
}

export async function getRecentLeads(supabase: Client, limit = 10) {
  const { data } = await supabase
    .from("leads")
    .select(
      "id, full_name, phone, status, created_at, program_id, source_id, assigned_counselor_id"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getTodaysOperations(supabase: Client) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + 86_400_000).toISOString();
  const now = new Date().toISOString();

  const [
    newToday,
    uncontacted,
    documentsPending,
    applicationsPending,
    followUpsDueTodayRes,
    overdueFollowUpsRes,
  ] = await Promise.all([
    countLeadsCreatedSince(supabase, startOfToday.toISOString()),
    countLeadsWithStatus(supabase, ["NEW"]),
    countLeadsWithStatus(supabase, ["DOCUMENTS_PENDING"]),
    countLeadsWithStatus(supabase, ["APPLICATION_STARTED"]),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("due_at", startOfToday.toISOString())
      .lt("due_at", endOfToday),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("due_at", now),
  ]);

  return {
    newToday,
    uncontacted,
    documentsPending,
    applicationsPending,
    followUpsDueToday: followUpsDueTodayRes.count ?? 0,
    overdueFollowUps: overdueFollowUpsRes.count ?? 0,
  };
}
