import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CampaignStatus,
  Database,
  MessageStatus,
  SegmentDefinition,
} from "@/types/database";
import { getProfilesMap, getProgramsMap } from "@/features/leads/lookups";
import type { LeadContext } from "@/lib/messaging/send";

type Client = SupabaseClient<Database>;

// ── Inbox ───────────────────────────────────────────────────────────────────
export interface ConversationRow {
  conversationId: string;
  leadId: string;
  name: string;
  phone: string;
  preview: string | null;
  lastAt: string | null;
  lastDirection: "inbound" | "outbound" | null;
  unread: number;
}

export async function getConversations(supabase: Client): Promise<ConversationRow[]> {
  const { data: convos } = await supabase
    .from("conversations")
    .select("id, lead_id, last_message_at, last_message_preview, last_direction, unread_count")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (!convos || convos.length === 0) return [];

  const leadIds = convos.map((c) => c.lead_id);
  const { data: leads } = await supabase
    .from("leads")
    .select("id, full_name, phone")
    .in("id", leadIds);
  const leadMap = new Map((leads ?? []).map((l) => [l.id, l]));

  return convos.map((c) => {
    const lead = leadMap.get(c.lead_id);
    return {
      conversationId: c.id,
      leadId: c.lead_id,
      name: lead?.full_name ?? "Unknown",
      phone: lead?.phone ?? "",
      preview: c.last_message_preview,
      lastAt: c.last_message_at,
      lastDirection: c.last_direction,
      unread: c.unread_count,
    };
  });
}

export interface ThreadMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: MessageStatus;
  createdAt: string;
}

export async function getConversationThread(supabase: Client, conversationId: string) {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, lead_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;

  const [{ data: lead }, { data: messages }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, full_name, phone, status, program_id, assigned_counselor_id")
      .eq("id", conversation.lead_id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, direction, body, status, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
  ]);
  if (!lead) return null;

  const suppressed = await supabase
    .from("message_suppressions")
    .select("*", { count: "exact", head: true })
    .eq("lead_id", lead.id);

  return {
    conversationId,
    lead,
    suppressed: (suppressed.count ?? 0) > 0,
    messages: (messages ?? []).map(
      (m): ThreadMessage => ({
        id: m.id,
        direction: m.direction,
        body: m.body,
        status: m.status,
        createdAt: m.created_at,
      })
    ),
  };
}

// ── Lead context for template substitution ──────────────────────────────────
export async function getLeadContexts(
  supabase: Client,
  leadIds: string[]
): Promise<Map<string, LeadContext & { phone: string }>> {
  if (leadIds.length === 0) return new Map();
  const [{ data: leads }, programsMap, profilesMap] = await Promise.all([
    supabase
      .from("leads")
      .select("id, full_name, phone, program_id, assigned_counselor_id")
      .in("id", leadIds),
    getProgramsMap(supabase),
    getProfilesMap(supabase),
  ]);

  return new Map(
    (leads ?? []).map((l) => [
      l.id,
      {
        fullName: l.full_name,
        phone: l.phone,
        programName: l.program_id ? programsMap.get(l.program_id)?.name ?? null : null,
        counselorName: l.assigned_counselor_id
          ? profilesMap.get(l.assigned_counselor_id)?.full_name ?? null
          : null,
      },
    ])
  );
}

// ── Templates ───────────────────────────────────────────────────────────────
export async function getTemplates(supabase: Client) {
  const { data } = await supabase
    .from("message_templates")
    .select("id, name, category, language, body, status, updated_at")
    .order("name");
  return data ?? [];
}

// ── Segments ────────────────────────────────────────────────────────────────
export async function resolveSegmentLeads(supabase: Client, definition: SegmentDefinition) {
  let q = supabase
    .from("leads")
    .select("id, full_name, phone, program_id, assigned_counselor_id, status, city")
    .limit(5000);

  if (definition.statuses?.length) q = q.in("status", definition.statuses);
  if (definition.programId) q = q.eq("program_id", definition.programId);
  if (definition.counselorId) q = q.eq("assigned_counselor_id", definition.counselorId);
  if (definition.city) q = q.ilike("city", definition.city);

  const { data } = await q;
  return data ?? [];
}

export async function getSegments(supabase: Client) {
  const { data: segments } = await supabase
    .from("audience_segments")
    .select("id, name, description, definition, updated_at")
    .order("name");
  if (!segments) return [];

  return Promise.all(
    segments.map(async (s) => ({
      ...s,
      count: (await resolveSegmentLeads(supabase, s.definition)).length,
    }))
  );
}

// ── Campaigns ───────────────────────────────────────────────────────────────
export interface CampaignRow {
  id: string;
  name: string;
  status: CampaignStatus;
  templateName: string | null;
  segmentName: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export async function getCampaigns(supabase: Client): Promise<CampaignRow[]> {
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, status, template_id, segment_id, scheduled_at, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!campaigns || campaigns.length === 0) return [];

  const templateIds = [...new Set(campaigns.map((c) => c.template_id))];
  const segmentIds = [...new Set(campaigns.map((c) => c.segment_id).filter(Boolean) as string[])];
  const campaignIds = campaigns.map((c) => c.id);

  const [{ data: templates }, { data: segments }, { data: recipients }] = await Promise.all([
    supabase.from("message_templates").select("id, name").in("id", templateIds),
    segmentIds.length
      ? supabase.from("audience_segments").select("id, name").in("id", segmentIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("campaign_recipients").select("campaign_id, status").in("campaign_id", campaignIds),
  ]);

  const templateName = new Map((templates ?? []).map((t) => [t.id, t.name]));
  const segmentName = new Map((segments ?? []).map((s) => [s.id, s.name]));

  const stats = new Map<string, { total: number; sent: number; delivered: number; read: number; failed: number }>();
  for (const r of recipients ?? []) {
    const s = stats.get(r.campaign_id) ?? { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
    s.total += 1;
    if (r.status === "sent" || r.status === "delivered" || r.status === "read") s.sent += 1;
    if (r.status === "delivered" || r.status === "read") s.delivered += 1;
    if (r.status === "read") s.read += 1;
    if (r.status === "failed") s.failed += 1;
    stats.set(r.campaign_id, s);
  }

  return campaigns.map((c) => {
    const s = stats.get(c.id) ?? { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      templateName: templateName.get(c.template_id) ?? null,
      segmentName: c.segment_id ? segmentName.get(c.segment_id) ?? null : null,
      scheduledAt: c.scheduled_at,
      sentAt: c.sent_at,
      ...s,
    };
  });
}

// ── Suppressions (opt-outs) ─────────────────────────────────────────────────
export async function getSuppressions(supabase: Client) {
  const { data: rows } = await supabase
    .from("message_suppressions")
    .select("id, lead_id, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (!rows || rows.length === 0) return [];

  const { data: leads } = await supabase
    .from("leads")
    .select("id, full_name, phone")
    .in("id", rows.map((r) => r.lead_id));
  const leadMap = new Map((leads ?? []).map((l) => [l.id, l]));

  return rows.map((r) => ({
    id: r.id,
    leadId: r.lead_id,
    name: leadMap.get(r.lead_id)?.full_name ?? "Unknown",
    phone: leadMap.get(r.lead_id)?.phone ?? "",
    reason: r.reason,
    createdAt: r.created_at,
  }));
}

// ── Nurture rules ───────────────────────────────────────────────────────────
export async function getNurtureRules(supabase: Client) {
  const { data: rules } = await supabase
    .from("nurture_rules")
    .select("id, name, trigger, to_status, template_id, is_active, updated_at")
    .order("created_at", { ascending: false });
  if (!rules || rules.length === 0) return [];

  const templateIds = [...new Set(rules.map((r) => r.template_id))];
  const ruleIds = rules.map((r) => r.id);
  const [{ data: templates }, { data: runs }] = await Promise.all([
    supabase.from("message_templates").select("id, name").in("id", templateIds),
    supabase.from("nurture_runs").select("rule_id").in("rule_id", ruleIds),
  ]);
  const templateName = new Map((templates ?? []).map((t) => [t.id, t.name]));
  const runCounts = new Map<string, number>();
  for (const run of runs ?? []) runCounts.set(run.rule_id, (runCounts.get(run.rule_id) ?? 0) + 1);

  return rules.map((r) => ({
    ...r,
    templateName: templateName.get(r.template_id) ?? null,
    runCount: runCounts.get(r.id) ?? 0,
  }));
}

// ── Inbox summary (nav badge / header) ──────────────────────────────────────
export async function getInboxSummary(supabase: Client) {
  const [conversations, queued] = await Promise.all([
    supabase.from("conversations").select("*", { count: "exact", head: true }),
    supabase.from("messages").select("*", { count: "exact", head: true }).eq("status", "queued"),
  ]);
  return {
    conversations: conversations.count ?? 0,
    queued: queued.count ?? 0,
  };
}
