"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit/log";
import { createClient } from "@/lib/supabase/server";
import { getLeadContexts, resolveSegmentLeads } from "@/features/messaging/data";
import { renderTemplate, sendMessageToLead } from "@/lib/messaging/send";
import { processNurtureRules } from "@/lib/messaging/nurture";
import { ALL_LEAD_STATUSES } from "@/features/leads/status";
import type { LeadStatus, SegmentDefinition } from "@/types/database";

export interface ActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

const CATEGORIES = ["marketing", "utility", "authentication"] as const;

// ── Inbox: reply to a conversation ──────────────────────────────────────────
const replySchema = z.object({
  leadId: z.string().uuid(),
  body: z.string().trim().min(1).max(4096),
});

export async function sendReply(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const parsed = replySchema.safeParse({
    leadId: formData.get("leadId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: "Enter a message to send." };

  const supabase = await createClient();
  const ctx = (await getLeadContexts(supabase, [parsed.data.leadId])).get(parsed.data.leadId);
  if (!ctx || !ctx.phone) return { error: "This lead has no phone number." };

  const outcome = await sendMessageToLead(supabase, {
    leadId: parsed.data.leadId,
    body: parsed.data.body,
    sentBy: actor.id,
    toPhone: ctx.phone,
  });
  if (outcome.status === "suppressed") return { error: "This lead has opted out of messages." };
  if (!outcome.messageId) return { error: outcome.error ?? "Could not send the message." };

  await supabase.from("lead_activities").insert({
    lead_id: parsed.data.leadId,
    actor_id: actor.id,
    activity_type: "whatsapp",
    description: parsed.data.body.slice(0, 280),
  });

  revalidatePath("/messaging");
  return { ok: true };
}

// ── Templates ───────────────────────────────────────────────────────────────
const templateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores."),
  category: z.enum(CATEGORIES),
  body: z.string().trim().min(1).max(4096),
});

export async function createTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff(["super_admin", "admissions_manager"]);
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid template." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_templates")
    .insert({ ...parsed.data, created_by: actor.id })
    .select("id")
    .single();
  if (error) return { error: "Could not save. Is the name already used?" };

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: "template.created",
    entityType: "message_template",
    entityId: data.id,
    newValue: parsed.data,
  });
  revalidatePath("/messaging/templates");
  return { ok: true };
}

// ── Segments ────────────────────────────────────────────────────────────────
// Radix Select can't use an empty option value, so the forms send "any" to
// mean "no constraint"; normalise it away here.
function optionalId(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value && value !== "any" ? value : undefined;
}

const segmentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(280).optional(),
  programId: z.string().uuid().optional(),
  counselorId: z.string().uuid().optional(),
  city: z.string().trim().max(80).optional(),
});

export async function createSegment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff(["super_admin", "admissions_manager"]);
  const parsed = segmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    programId: optionalId(formData.get("programId")),
    counselorId: optionalId(formData.get("counselorId")),
    city: formData.get("city") || undefined,
  });
  if (!parsed.success) return { error: "Give the segment a name." };

  const statuses = formData
    .getAll("statuses")
    .filter((s): s is string => typeof s === "string" && ALL_LEAD_STATUSES.includes(s as LeadStatus));

  const definition: SegmentDefinition = {};
  if (statuses.length) definition.statuses = statuses as LeadStatus[];
  if (parsed.data.programId) definition.programId = parsed.data.programId;
  if (parsed.data.counselorId) definition.counselorId = parsed.data.counselorId;
  if (parsed.data.city) definition.city = parsed.data.city;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audience_segments")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      definition,
      created_by: actor.id,
    })
    .select("id")
    .single();
  if (error) return { error: "Could not save. Is the name already used?" };

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: "segment.created",
    entityType: "audience_segment",
    entityId: data.id,
    newValue: { name: parsed.data.name, definition },
  });
  revalidatePath("/messaging/segments");
  return { ok: true };
}

// ── Campaigns ───────────────────────────────────────────────────────────────
const campaignSchema = z.object({
  name: z.string().trim().min(2).max(120),
  templateId: z.string().uuid(),
  segmentId: z.string().uuid().optional(),
});

export async function createCampaign(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff(["super_admin", "admissions_manager"]);
  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    templateId: formData.get("templateId"),
    segmentId: optionalId(formData.get("segmentId")),
  });
  if (!parsed.success) return { error: "Pick a template and name the campaign." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: parsed.data.name,
      template_id: parsed.data.templateId,
      segment_id: parsed.data.segmentId || null,
      created_by: actor.id,
    })
    .select("id")
    .single();
  if (error) return { error: "Could not create the campaign." };

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: "campaign.created",
    entityType: "campaign",
    entityId: data.id,
    newValue: { name: parsed.data.name },
  });
  revalidatePath("/messaging/campaigns");
  return { ok: true };
}

export async function sendCampaignNow(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff(["super_admin", "admissions_manager"]);
  const campaignId = z.string().uuid().safeParse(formData.get("campaignId"));
  if (!campaignId.success) return { error: "Unknown campaign." };

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, template_id, segment_id, status")
    .eq("id", campaignId.data)
    .single();
  if (!campaign) return { error: "Campaign not found." };
  if (campaign.status === "completed" || campaign.status === "sending") {
    return { error: "This campaign has already been sent." };
  }

  const { data: template } = await supabase
    .from("message_templates")
    .select("body")
    .eq("id", campaign.template_id)
    .single();
  if (!template) return { error: "The campaign's template is missing." };

  let definition: SegmentDefinition = {};
  if (campaign.segment_id) {
    const { data: segment } = await supabase
      .from("audience_segments")
      .select("definition")
      .eq("id", campaign.segment_id)
      .single();
    definition = segment?.definition ?? {};
  }

  const leads = await resolveSegmentLeads(supabase, definition);
  await supabase.from("campaigns").update({ status: "sending" }).eq("id", campaign.id);

  const contexts = await getLeadContexts(supabase, leads.map((l) => l.id));
  let queued = 0;
  let skipped = 0;

  for (const lead of leads) {
    const ctx = contexts.get(lead.id);
    if (!ctx || !ctx.phone) {
      skipped += 1;
      await supabase.from("campaign_recipients").upsert(
        { campaign_id: campaign.id, lead_id: lead.id, status: "failed", error: "No phone number." },
        { onConflict: "campaign_id,lead_id" }
      );
      continue;
    }
    const outcome = await sendMessageToLead(supabase, {
      leadId: lead.id,
      body: renderTemplate(template.body, ctx),
      templateId: campaign.template_id,
      campaignId: campaign.id,
      sentBy: actor.id,
      toPhone: ctx.phone,
    });
    const suppressed = outcome.status === "suppressed";
    if (suppressed) skipped += 1;
    else queued += 1;
    await supabase.from("campaign_recipients").upsert(
      {
        campaign_id: campaign.id,
        lead_id: lead.id,
        message_id: outcome.messageId ?? null,
        status: suppressed || outcome.status === "suppressed" ? "failed" : outcome.status,
        error: suppressed ? "Opted out." : null,
      },
      { onConflict: "campaign_id,lead_id" }
    );
  }

  await supabase
    .from("campaigns")
    .update({ status: "completed", sent_at: new Date().toISOString() })
    .eq("id", campaign.id);

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: "campaign.sent",
    entityType: "campaign",
    entityId: campaign.id,
    newValue: { queued, skipped, total: leads.length },
  });

  revalidatePath("/messaging/campaigns");
  return { ok: true, message: `Queued ${queued} message${queued === 1 ? "" : "s"}, skipped ${skipped}.` };
}

// ── Suppression (opt-out) ───────────────────────────────────────────────────
const suppressSchema = z.object({
  leadId: z.string().uuid(),
  action: z.enum(["add", "remove"]),
});

export async function toggleSuppression(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff(["super_admin", "admissions_manager"]);
  const parsed = suppressSchema.safeParse({
    leadId: formData.get("leadId"),
    action: formData.get("action"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const supabase = await createClient();
  if (parsed.data.action === "add") {
    const { error } = await supabase
      .from("message_suppressions")
      .upsert({ lead_id: parsed.data.leadId, reason: "manual", created_by: actor.id }, { onConflict: "lead_id" });
    if (error) return { error: "Could not opt this lead out." };
  } else {
    const { error } = await supabase
      .from("message_suppressions")
      .delete()
      .eq("lead_id", parsed.data.leadId);
    if (error) return { error: "Could not opt this lead back in." };
  }

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: parsed.data.action === "add" ? "suppression.added" : "suppression.removed",
    entityType: "lead",
    entityId: parsed.data.leadId,
  });
  revalidatePath("/messaging/opt-outs");
  revalidatePath("/messaging");
  return { ok: true };
}

// ── Nurture rules ───────────────────────────────────────────────────────────
const ruleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  trigger: z.enum(["lead_created", "lead_status_changed"]),
  templateId: z.string().uuid(),
  toStatus: z.string().optional(),
});

export async function createNurtureRule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff(["super_admin", "admissions_manager"]);
  const parsed = ruleSchema.safeParse({
    name: formData.get("name"),
    trigger: formData.get("trigger"),
    templateId: formData.get("templateId"),
    toStatus: formData.get("toStatus") || undefined,
  });
  if (!parsed.success) return { error: "Fill in the rule name, trigger and template." };

  const toStatus =
    parsed.data.trigger === "lead_status_changed" &&
    parsed.data.toStatus &&
    ALL_LEAD_STATUSES.includes(parsed.data.toStatus as LeadStatus)
      ? (parsed.data.toStatus as LeadStatus)
      : null;
  if (parsed.data.trigger === "lead_status_changed" && !toStatus) {
    return { error: "Choose the status that triggers this rule." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nurture_rules")
    .insert({
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      to_status: toStatus,
      template_id: parsed.data.templateId,
      created_by: actor.id,
    })
    .select("id")
    .single();
  if (error) return { error: "Could not save the rule." };

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: "nurture_rule.created",
    entityType: "nurture_rule",
    entityId: data.id,
    newValue: { name: parsed.data.name, trigger: parsed.data.trigger, to_status: toStatus },
  });
  revalidatePath("/messaging/automation");
  return { ok: true };
}

export async function toggleNurtureRule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff(["super_admin", "admissions_manager"]);
  const parsed = z
    .object({ id: z.string().uuid(), isActive: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), isActive: formData.get("isActive") });
  if (!parsed.success) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("nurture_rules")
    .update({ is_active: parsed.data.isActive === "true" })
    .eq("id", parsed.data.id);
  if (error) return { error: "Could not update the rule." };

  revalidatePath("/messaging/automation");
  return { ok: true };
}

export async function runNurtureNow(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  void _formData;
  const actor = await requireStaff(["super_admin", "admissions_manager"]);
  const supabase = await createClient();
  const { sent, skipped } = await processNurtureRules(supabase, actor.id);

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: "nurture.run",
    entityType: "nurture_rule",
    newValue: { sent, skipped },
  });
  revalidatePath("/messaging/automation");
  revalidatePath("/messaging");
  return { ok: true, message: `Sent ${sent} message${sent === 1 ? "" : "s"}, skipped ${skipped}.` };
}
