"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit/log";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUSES } from "@/features/portal/application-status";
import type { ApplicationStatus } from "@/types/database";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

const statusSchema = z.object({
  applicationId: z.string().uuid(),
  leadId: z.string().uuid(),
  status: z.enum(APPLICATION_STATUSES as [ApplicationStatus, ...ApplicationStatus[]]),
});

// Admin/manager set the admission status. RLS lets them update any application
// (is_admin_or_manager passes both USING and WITH CHECK), so the normal
// session client is fine here.
export async function updateApplicationStatus(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireStaff(["super_admin", "admissions_manager"]);
  const parsed = statusSchema.safeParse({
    applicationId: formData.get("applicationId"),
    leadId: formData.get("leadId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Invalid status change." };

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("id, status")
    .eq("id", parsed.data.applicationId)
    .single();
  if (!application) return { error: "Application not found." };
  if (application.status === parsed.data.status) return { ok: true };

  const { error } = await supabase
    .from("applications")
    .update({ status: parsed.data.status })
    .eq("id", application.id);
  if (error) return { error: "Could not update status." };

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: "application.status_changed",
    entityType: "application",
    entityId: application.id,
    previousValue: { status: application.status },
    newValue: { status: parsed.data.status },
  });

  revalidatePath(`/leads/${parsed.data.leadId}`);
  revalidatePath("/admissions");
  revalidatePath("/admissions/students");
  return { ok: true };
}

const paymentSchema = z.object({
  paymentId: z.string().uuid(),
  amountPaid: z.coerce.number().min(0),
  status: z.enum(["PENDING", "PARTIAL", "PAID"]),
});

// Staff record offline fee payments until the gateway is wired. The student
// sees the updated status in their portal.
export async function updatePayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff(["super_admin", "admissions_manager"]);
  const parsed = paymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
    amountPaid: formData.get("amountPaid"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Enter a valid amount and status." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("payments")
    .select("id, amount_paid, status")
    .eq("id", parsed.data.paymentId)
    .single();
  if (!existing) return { error: "Payment not found." };

  const { error } = await supabase
    .from("payments")
    .update({ amount_paid: parsed.data.amountPaid, status: parsed.data.status })
    .eq("id", parsed.data.paymentId);
  if (error) return { error: "Could not update the payment." };

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: "payment.updated",
    entityType: "payment",
    entityId: parsed.data.paymentId,
    previousValue: { amount_paid: existing.amount_paid, status: existing.status },
    newValue: { amount_paid: parsed.data.amountPaid, status: parsed.data.status },
  });

  revalidatePath("/admissions/payments");
  revalidatePath("/portal");
  return { ok: true };
}
