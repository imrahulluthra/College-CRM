"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface SubmitState {
  error?: string;
  ok?: boolean;
}

// Final step of the wizard: submit the application. Payment itself stays
// offline until the gateway lands (see docs/WORKFLOWS.md); this flips the
// application out of DRAFT so staff can review it.
//
// The ownership SELECT runs on the student's RLS session, so it can only ever
// return THIS student's application (a student can't submit anyone else's).
// The status UPDATE then runs on the service-role client: the applications
// UPDATE RLS policy gates students to `status = 'DRAFT'` in its USING clause,
// which Postgres also applies as the WITH CHECK for the new row — so a student
// session physically cannot move a row from DRAFT to SUBMITTED. All student
// mutations of the applications row go through this controlled action instead.
export async function submitApplication(prev: SubmitState): Promise<SubmitState> {
  void prev; // useActionState passes prior state; this action doesn't need it.
  const user = await requireStudent();
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, status")
    .eq("student_user_id", user.id)
    .maybeSingle();
  if (!application) return { error: "No application found." };
  if (application.status !== "DRAFT") return { ok: true };

  const admin = createAdminClient();
  const { error } = await admin
    .from("applications")
    .update({ status: "SUBMITTED", submitted_at: new Date().toISOString() })
    .eq("id", application.id);
  if (error) {
    console.error("[submitApplication] update failed", error);
    return { error: "Could not submit your application. Try again." };
  }

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "application.submitted",
    entityType: "application",
    entityId: application.id,
  });

  revalidatePath("/portal");
  revalidatePath("/portal/fees");
  return { ok: true };
}
