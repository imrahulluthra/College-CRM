import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getLeadContexts } from "@/features/messaging/data";
import { renderTemplate, sendMessageToLead } from "./send";

type Client = SupabaseClient<Database>;

/**
 * Evaluates every active nurture rule and sends its template to matching leads
 * that haven't received it yet. Idempotent: the nurture_runs ledger
 * (unique rule_id + lead_id) means running this repeatedly never double-sends,
 * so it's safe to call from a manual "Run now" button today and from a
 * scheduled worker later. Suppressed (opted-out) leads are skipped and not
 * recorded, so they still qualify if they later opt back in.
 */
export async function processNurtureRules(
  supabase: Client,
  actorId: string
): Promise<{ sent: number; skipped: number }> {
  const { data: rules } = await supabase
    .from("nurture_rules")
    .select("id, trigger, to_status, template_id")
    .eq("is_active", true);
  if (!rules || rules.length === 0) return { sent: 0, skipped: 0 };

  const templateIds = [...new Set(rules.map((r) => r.template_id))];
  const { data: templates } = await supabase
    .from("message_templates")
    .select("id, body")
    .in("id", templateIds);
  const bodyMap = new Map((templates ?? []).map((t) => [t.id, t.body]));

  let sent = 0;
  let skipped = 0;

  for (const rule of rules) {
    const body = bodyMap.get(rule.template_id);
    if (!body) continue;

    let q = supabase
      .from("leads")
      .select("id")
      .limit(500);
    if (rule.trigger === "lead_status_changed" && rule.to_status) {
      q = q.eq("status", rule.to_status);
    }
    const { data: leads } = await q;
    if (!leads || leads.length === 0) continue;

    const { data: runs } = await supabase
      .from("nurture_runs")
      .select("lead_id")
      .eq("rule_id", rule.id);
    const alreadyRun = new Set((runs ?? []).map((r) => r.lead_id));

    const pending = leads.filter((l) => !alreadyRun.has(l.id));
    if (pending.length === 0) continue;

    const contexts = await getLeadContexts(supabase, pending.map((l) => l.id));

    for (const lead of pending) {
      const ctx = contexts.get(lead.id);
      if (!ctx || !ctx.phone) {
        skipped += 1;
        continue;
      }
      const outcome = await sendMessageToLead(supabase, {
        leadId: lead.id,
        body: renderTemplate(body, ctx),
        templateId: rule.template_id,
        sentBy: actorId,
        toPhone: ctx.phone,
      });
      if (outcome.status === "suppressed") {
        skipped += 1;
        continue;
      }
      await supabase
        .from("nurture_runs")
        .insert({ rule_id: rule.id, lead_id: lead.id, message_id: outcome.messageId ?? null });
      sent += 1;
    }
  }

  return { sent, skipped };
}
