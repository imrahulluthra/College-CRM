import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, MessageStatus } from "@/types/database";
import { sendWhatsApp } from "./provider";

type Client = SupabaseClient<Database>;

export interface LeadContext {
  fullName: string;
  programName: string | null;
  counselorName: string | null;
}

/**
 * Substitutes {{placeholders}} in a template body from a lead's context.
 * Unknown placeholders are left as-is so a bad template is visible, not silent.
 */
export function renderTemplate(body: string, ctx: LeadContext): string {
  const firstName = ctx.fullName.trim().split(/\s+/)[0] || ctx.fullName;
  const values: Record<string, string> = {
    full_name: ctx.fullName,
    first_name: firstName,
    program: ctx.programName ?? "your program",
    counselor: ctx.counselorName ?? "our team",
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) =>
    key in values ? values[key] : whole
  );
}

export async function isSuppressed(supabase: Client, leadId: string): Promise<boolean> {
  const { count } = await supabase
    .from("message_suppressions")
    .select("*", { count: "exact", head: true })
    .eq("lead_id", leadId);
  return (count ?? 0) > 0;
}

/** Finds or creates the lead's conversation, returning its id. */
export async function ensureConversation(supabase: Client, leadId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("conversations")
    .insert({ lead_id: leadId })
    .select("id")
    .single();
  return created?.id ?? null;
}

export interface SendOutcome {
  ok: boolean;
  status: MessageStatus | "suppressed";
  messageId?: string;
  error?: string;
}

/**
 * Sends one outbound WhatsApp message to a lead: honours the suppression list,
 * ensures a conversation, records the message through the provider seam, and
 * refreshes the conversation's last-message summary. `body` must already be
 * rendered (call renderTemplate first when sending from a template).
 */
export async function sendMessageToLead(
  supabase: Client,
  input: {
    leadId: string;
    body: string;
    templateId?: string | null;
    campaignId?: string | null;
    sentBy?: string | null;
    toPhone: string;
  }
): Promise<SendOutcome> {
  if (await isSuppressed(supabase, input.leadId)) {
    return { ok: false, status: "suppressed", error: "Lead has opted out." };
  }

  const conversationId = await ensureConversation(supabase, input.leadId);
  if (!conversationId) return { ok: false, status: "failed", error: "Could not open a conversation." };

  const result = await sendWhatsApp(input.toPhone, input.body);

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      lead_id: input.leadId,
      direction: "outbound",
      body: input.body,
      status: result.status,
      template_id: input.templateId ?? null,
      campaign_id: input.campaignId ?? null,
      sent_by: input.sentBy ?? null,
      provider_message_id: result.providerMessageId,
      error: result.error,
    })
    .select("id")
    .single();

  if (error || !message) return { ok: false, status: "failed", error: "Could not record the message." };

  await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: input.body.slice(0, 140),
      last_direction: "outbound",
    })
    .eq("id", conversationId);

  return { ok: result.status !== "failed", status: result.status, messageId: message.id };
}
