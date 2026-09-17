"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStudent } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit/log";
import { createClient } from "@/lib/supabase/server";

const pct = z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined));

const schema = z.object({
  intent: z.enum(["save", "submit"]),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  tenth_percentage: pct,
  twelfth_percentage: pct,
  graduation_percentage: pct,
  entrance_exam: z.string().optional(),
  entrance_score: z.string().optional(),
});

export interface AppFormState {
  error?: string;
  saved?: boolean;
}

export async function saveApplication(
  _prev: AppFormState,
  formData: FormData
): Promise<AppFormState> {
  const user = await requireStudent();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your entries." };
  }

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("id, status")
    .eq("student_user_id", user.id)
    .maybeSingle();
  if (!application) return { error: "No application found." };
  if (application.status !== "DRAFT") {
    return { error: "Your application has been submitted and can no longer be edited." };
  }

  const { intent, ...fields } = parsed.data;
  const { error } = await supabase
    .from("student_profiles")
    .update({
      date_of_birth: fields.date_of_birth || null,
      gender: fields.gender || null,
      address: fields.address || null,
      city: fields.city || null,
      state: fields.state || null,
      guardian_name: fields.guardian_name || null,
      guardian_phone: fields.guardian_phone || null,
      tenth_percentage: fields.tenth_percentage ?? null,
      twelfth_percentage: fields.twelfth_percentage ?? null,
      graduation_percentage: fields.graduation_percentage ?? null,
      entrance_exam: fields.entrance_exam || null,
      entrance_score: fields.entrance_score || null,
    })
    .eq("application_id", application.id);
  if (error) return { error: "Could not save your details." };

  if (intent === "submit") {
    const { error: submitError } = await supabase
      .from("applications")
      .update({ status: "SUBMITTED", submitted_at: new Date().toISOString() })
      .eq("id", application.id);
    if (submitError) return { error: "Saved, but could not submit. Try again." };

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "application.submitted",
      entityType: "application",
      entityId: application.id,
    });
  }

  revalidatePath("/portal");
  revalidatePath("/portal/application");
  return { saved: true };
}
