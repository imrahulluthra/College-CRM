"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit/log";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  documentId: z.string().uuid(),
  leadId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().optional(),
});

export interface ReviewState {
  error?: string;
  ok?: boolean;
}

export async function reviewDocument(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const actor = await requireStaff(["super_admin", "admissions_manager", "document_reviewer"]);
  const parsed = schema.safeParse({
    documentId: formData.get("documentId"),
    leadId: formData.get("leadId"),
    decision: formData.get("decision"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: "Invalid review." };

  if (parsed.data.decision === "REJECTED" && !parsed.data.reason) {
    return { error: "Give a reason when rejecting so the student can fix it." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("student_documents")
    .update({
      status: parsed.data.decision,
      rejection_reason: parsed.data.decision === "REJECTED" ? parsed.data.reason : null,
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.documentId);
  if (error) return { error: "Could not save the review." };

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: `document.${parsed.data.decision.toLowerCase()}`,
    entityType: "student_document",
    entityId: parsed.data.documentId,
    newValue: { decision: parsed.data.decision, reason: parsed.data.reason ?? null },
  });

  revalidatePath(`/leads/${parsed.data.leadId}`);
  // The staff-wide document queue and applicants list also show these docs.
  revalidatePath("/admissions/documents");
  revalidatePath("/admissions/students");
  return { ok: true };
}
