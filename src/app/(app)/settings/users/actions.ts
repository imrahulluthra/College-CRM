"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const createUserSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  role: z.enum(["super_admin", "admissions_manager", "counselor", "document_reviewer"]),
});

export interface CreateUserState {
  error?: string;
  success?: { email: string; tempPassword: string };
}

function generateTempPassword() {
  // 12 random bytes -> base64url, plus a fixed suffix so it always satisfies
  // typical password-strength rules (upper/lower/digit/symbol).
  return `${randomBytes(9).toString("base64url")}!A1`;
}

export async function createStaffUser(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const actor = await requireUser(["super_admin"]);

  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { fullName, email, phone, role } = parsed.data;
  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create the login." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    email,
    phone: phone ?? null,
    created_by: actor.id,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Could not create the profile. No login was created." };
  }

  const { error: roleError } = await admin
    .from("user_roles")
    .insert({ user_id: created.user.id, role: role as UserRole });

  if (roleError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Could not assign the role. No login was created." };
  }

  await writeAuditLog(admin, {
    actorId: actor.id,
    action: "user.created",
    entityType: "profile",
    entityId: created.user.id,
    newValue: { full_name: fullName, email, role },
  });

  revalidatePath("/settings/users");

  return { success: { email, tempPassword } };
}

export async function deactivateStaffUser(userId: string) {
  const actor = await requireUser(["super_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (!error) {
    await writeAuditLog(supabase, {
      actorId: actor.id,
      action: "user.deactivated",
      entityType: "profile",
      entityId: userId,
    });
    revalidatePath("/settings/users");
  }

  return { error: error?.message };
}
