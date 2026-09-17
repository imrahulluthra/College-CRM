"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface ConvertState {
  error?: string;
  success?: { email: string; tempPassword: string };
}

// Turns a Phase-1 lead into a Phase-2 applicant: same lead row, plus a student
// login, an application, an empty student profile, and a fee row. Preserves
// lead history (activity + status). Mirrors the staff-creation flow in
// settings/users/actions.ts.
export async function convertLeadToApplicant(
  _prev: ConvertState,
  formData: FormData
): Promise<ConvertState> {
  const actor = await requireUser(["super_admin", "admissions_manager", "counselor"]);
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return { error: "Missing lead." };

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, full_name, email, program_id, admission_cycle_id")
    .eq("id", leadId)
    .single();
  if (!lead) return { error: "Lead not found." };
  if (!lead.email) return { error: "Add an email to this lead before converting." };

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (existing) return { error: "This lead has already been converted." };

  const admin = createAdminClient();
  const tempPassword = `${randomBytes(9).toString("base64url")}!A1`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: lead.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: lead.full_name },
  });
  if (createError || !created.user) {
    // Most likely the email already has a login.
    return { error: createError?.message ?? "Could not create the student login." };
  }
  const studentId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: studentId,
    full_name: lead.full_name,
    email: lead.email,
    created_by: actor.id,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(studentId);
    return { error: "Could not create the student profile." };
  }

  await admin.from("user_roles").insert({ user_id: studentId, role: "student" });

  const { data: application, error: appError } = await admin
    .from("applications")
    .insert({
      lead_id: leadId,
      student_user_id: studentId,
      program_id: lead.program_id,
      admission_cycle_id: lead.admission_cycle_id,
      status: "DRAFT",
    })
    .select("id")
    .single();
  if (appError || !application) {
    await admin.auth.admin.deleteUser(studentId);
    return { error: "Could not create the application." };
  }

  await admin.from("student_profiles").insert({ application_id: application.id });

  // Seed the fee row from the program's headline fee (if set).
  let feeAmount: number | null = null;
  if (lead.program_id) {
    const { data: program } = await admin
      .from("programs")
      .select("fee_amount")
      .eq("id", lead.program_id)
      .maybeSingle();
    feeAmount = program?.fee_amount ?? null;
  }
  if (feeAmount != null) {
    await admin.from("payments").insert({
      application_id: application.id,
      amount_total: feeAmount,
      status: "PENDING",
    });
  }

  await Promise.all([
    admin.from("leads").update({ status: "APPLICATION_STARTED" }).eq("id", leadId),
    admin.from("lead_status_history").insert({
      lead_id: leadId,
      to_status: "APPLICATION_STARTED",
      changed_by: actor.id,
      reason: "Converted to applicant",
    }),
    admin.from("lead_activities").insert({
      lead_id: leadId,
      actor_id: actor.id,
      activity_type: "application_link_sent",
      description: `Converted to applicant by ${actor.fullName}. Student login created.`,
    }),
    writeAuditLog(admin, {
      actorId: actor.id,
      action: "lead.converted_to_applicant",
      entityType: "application",
      entityId: application.id,
      newValue: { lead_id: leadId, student_user_id: studentId },
    }),
  ]);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: { email: lead.email, tempPassword } };
}
