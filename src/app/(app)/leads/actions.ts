"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit/log";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { ALL_LEAD_STATUSES } from "@/features/leads/status";
import type { LeadStatus } from "@/types/database";

const createLeadSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a name."),
  phone: z.string().trim().min(6, "Enter a valid phone number."),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  city: z.string().trim().optional(),
  programId: z.string().uuid().optional().or(z.literal("")),
  sourceId: z.string().uuid().optional().or(z.literal("")),
});

export interface ActionState {
  error?: string;
  success?: boolean;
}

export async function createLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser(["super_admin", "admissions_manager", "counselor"]);
  const parsed = createLeadSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    city: formData.get("city") || undefined,
    programId: formData.get("programId") || undefined,
    sourceId: formData.get("sourceId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { fullName, phone, email, city, programId, sourceId } = parsed.data;
  const phoneNormalized = normalizePhone(phone);

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("phone_normalized", phoneNormalized)
    .maybeSingle();

  if (existing) {
    return { error: "A lead with this phone number already exists." };
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      full_name: fullName,
      phone,
      email: email || null,
      city: city || null,
      program_id: programId || null,
      source_id: sourceId || null,
      status: "NEW",
    })
    .select("id")
    .single();

  if (error || !lead) {
    return { error: "Could not create the lead." };
  }

  await Promise.all([
    supabase.from("lead_activities").insert({
      lead_id: lead.id,
      actor_id: actor.id,
      activity_type: "created",
      description: `Lead manually added by ${actor.fullName}.`,
    }),
    supabase.from("lead_status_history").insert({
      lead_id: lead.id,
      from_status: null,
      to_status: "NEW",
      changed_by: actor.id,
    }),
    writeAuditLog(supabase, {
      actorId: actor.id,
      action: "lead.created",
      entityType: "lead",
      entityId: lead.id,
      newValue: { full_name: fullName, phone },
    }),
  ]);

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true };
}

const statusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(ALL_LEAD_STATUSES as [LeadStatus, ...LeadStatus[]]),
  reason: z.string().trim().optional(),
});

export async function updateLeadStatus(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireUser();
  const parsed = statusSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) return { error: "Invalid status change." };

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, status, full_name")
    .eq("id", parsed.data.leadId)
    .single();

  if (!lead) return { error: "Lead not found or you don't have access to it." };
  if (lead.status === parsed.data.status) return { success: true };

  const { error } = await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", lead.id);

  if (error) return { error: "Could not update status." };

  await Promise.all([
    supabase.from("lead_status_history").insert({
      lead_id: lead.id,
      from_status: lead.status,
      to_status: parsed.data.status,
      changed_by: actor.id,
      reason: parsed.data.reason || null,
    }),
    supabase.from("lead_activities").insert({
      lead_id: lead.id,
      actor_id: actor.id,
      activity_type: "status_changed",
      description: `Status changed from ${lead.status} to ${parsed.data.status}${
        parsed.data.reason ? ` — ${parsed.data.reason}` : ""
      }.`,
    }),
    writeAuditLog(supabase, {
      actorId: actor.id,
      action: "lead.status_changed",
      entityType: "lead",
      entityId: lead.id,
      previousValue: { status: lead.status },
      newValue: { status: parsed.data.status },
    }),
  ]);

  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true };
}

const assignSchema = z.object({
  leadId: z.string().uuid(),
  counselorId: z.string().uuid(),
});

export async function assignCounselor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireUser(["super_admin", "admissions_manager"]);
  const parsed = assignSchema.safeParse({
    leadId: formData.get("leadId"),
    counselorId: formData.get("counselorId"),
  });
  if (!parsed.success) return { error: "Invalid assignment." };

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, assigned_counselor_id")
    .eq("id", parsed.data.leadId)
    .single();
  if (!lead) return { error: "Lead not found." };

  const { data: counselor } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", parsed.data.counselorId)
    .single();

  const { error } = await supabase
    .from("leads")
    .update({ assigned_counselor_id: parsed.data.counselorId })
    .eq("id", lead.id);
  if (error) return { error: "Could not assign counselor." };

  if (lead.assigned_counselor_id) {
    await supabase
      .from("lead_assignments")
      .update({ unassigned_at: new Date().toISOString() })
      .eq("lead_id", lead.id)
      .is("unassigned_at", null);
  }

  await Promise.all([
    supabase.from("lead_assignments").insert({
      lead_id: lead.id,
      counselor_id: parsed.data.counselorId,
      assigned_by: actor.id,
    }),
    supabase.from("lead_activities").insert({
      lead_id: lead.id,
      actor_id: actor.id,
      activity_type: lead.assigned_counselor_id ? "reassigned" : "assigned",
      description: `${lead.assigned_counselor_id ? "Reassigned" : "Assigned"} to ${counselor?.full_name ?? "counselor"}.`,
    }),
    writeAuditLog(supabase, {
      actorId: actor.id,
      action: "lead.assigned",
      entityType: "lead",
      entityId: lead.id,
      previousValue: { assigned_counselor_id: lead.assigned_counselor_id },
      newValue: { assigned_counselor_id: parsed.data.counselorId },
    }),
  ]);

  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true };
}

const noteSchema = z.object({
  leadId: z.string().uuid(),
  note: z.string().trim().min(1, "Note can't be empty."),
});

export async function addLeadNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const parsed = noteSchema.safeParse({
    leadId: formData.get("leadId"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid note." };

  const supabase = await createClient();
  const { error } = await supabase.from("lead_activities").insert({
    lead_id: parsed.data.leadId,
    actor_id: actor.id,
    activity_type: "note",
    description: parsed.data.note,
  });

  if (error) return { error: "Could not save the note. Do you have access to this lead?" };

  revalidatePath(`/leads/${parsed.data.leadId}`);
  return { success: true };
}

const taskSchema = z.object({
  leadId: z.string().uuid(),
  title: z.string().trim().min(2, "Enter a title."),
  taskType: z.enum(["call", "follow_up", "meeting", "document_reminder", "application_reminder", "other"]),
  dueAt: z.string().min(1, "Pick a due date/time."),
  assignedTo: z.string().uuid(),
});

export async function createLeadTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const parsed = taskSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    taskType: formData.get("taskType"),
    dueAt: formData.get("dueAt"),
    assignedTo: formData.get("assignedTo"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid task." };

  const supabase = await createClient();
  const dueAtIso = new Date(parsed.data.dueAt).toISOString();

  const { error } = await supabase.from("tasks").insert({
    lead_id: parsed.data.leadId,
    title: parsed.data.title,
    task_type: parsed.data.taskType,
    due_at: dueAtIso,
    assigned_to: parsed.data.assignedTo,
    created_by: actor.id,
  });
  if (error) return { error: "Could not create the task." };

  await supabase.from("lead_activities").insert({
    lead_id: parsed.data.leadId,
    actor_id: actor.id,
    activity_type: "task_created",
    description: `Task created: ${parsed.data.title}.`,
  });

  revalidatePath(`/leads/${parsed.data.leadId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function completeTask(taskId: string, leadId: string | null) {
  const actor = await requireUser();
  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("title")
    .single();

  if (!error && task && leadId) {
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      actor_id: actor.id,
      activity_type: "task_completed",
      description: `Task completed: ${task.title}.`,
    });
    revalidatePath(`/leads/${leadId}`);
  }
  revalidatePath("/dashboard");
  return { error: error?.message };
}

export async function cancelTask(taskId: string, leadId: string | null) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status: "cancelled" }).eq("id", taskId);
  if (!error && leadId) revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { error: error?.message };
}
