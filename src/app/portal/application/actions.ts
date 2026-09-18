"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const pct = z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined));

const schema = z.object({
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
}

// Step 1 of the application wizard: save the entered details, then advance to
// the Documents step. The application is NOT submitted here — submission
// happens on the Fees step (fees/actions.ts). Saving on every "Next" is what
// preserves data when the student navigates back and forth.
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

  // Already submitted → nothing to save, just move on through the flow.
  if (application.status !== "DRAFT") {
    redirect("/portal/documents");
  }

  const f = parsed.data;
  const { error } = await supabase
    .from("student_profiles")
    .update({
      date_of_birth: f.date_of_birth || null,
      gender: f.gender || null,
      address: f.address || null,
      city: f.city || null,
      state: f.state || null,
      guardian_name: f.guardian_name || null,
      guardian_phone: f.guardian_phone || null,
      tenth_percentage: f.tenth_percentage ?? null,
      twelfth_percentage: f.twelfth_percentage ?? null,
      graduation_percentage: f.graduation_percentage ?? null,
      entrance_exam: f.entrance_exam || null,
      entrance_score: f.entrance_score || null,
    })
    .eq("application_id", application.id);
  if (error) return { error: "Could not save your details." };

  revalidatePath("/portal");
  revalidatePath("/portal/application");
  redirect("/portal/documents");
}
