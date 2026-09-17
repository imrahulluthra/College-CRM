import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

interface AuditLogInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}

/**
 * Writes one audit_logs row. Call this from every server action / route
 * handler that mutates data the college cares about tracing (status
 * changes, assignments, role/user changes) -- see docs/RBAC.md.
 * Never throws: a failed audit write should not roll back the mutation it's
 * describing, so failures are swallowed after being logged to the console.
 */
export async function writeAuditLog(
  supabase: SupabaseClient<Database>,
  input: AuditLogInput
) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    previous_value: input.previousValue ?? null,
    new_value: input.newValue ?? null,
    context: input.context ?? {},
  });

  if (error) {
    console.error("[audit] failed to write audit log", input.action, input.entityType, error);
  }
}
