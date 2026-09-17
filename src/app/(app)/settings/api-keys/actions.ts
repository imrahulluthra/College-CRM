"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit/log";
import { generateApiKey } from "@/lib/api-keys";
import { createClient } from "@/lib/supabase/server";

const createKeySchema = z.object({
  name: z.string().trim().min(2, "Give the key a name, e.g. \"College website\"."),
});

export interface CreateKeyState {
  error?: string;
  success?: { name: string; fullKey: string };
}

export async function createApiKey(
  _prev: CreateKeyState,
  formData: FormData
): Promise<CreateKeyState> {
  const actor = await requireUser(["super_admin"]);
  const parsed = createKeySchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { fullKey, keyPrefix, keyHash } = generateApiKey();
  const supabase = await createClient();

  const { error } = await supabase.from("api_keys").insert({
    name: parsed.data.name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    created_by: actor.id,
  });

  if (error) {
    return { error: "Could not create the key." };
  }

  await writeAuditLog(supabase, {
    actorId: actor.id,
    action: "api_key.created",
    entityType: "api_key",
    newValue: { name: parsed.data.name, key_prefix: keyPrefix },
  });

  revalidatePath("/settings/api-keys");
  return { success: { name: parsed.data.name, fullKey } };
}

export async function revokeApiKey(keyId: string) {
  const actor = await requireUser(["super_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", keyId);

  if (!error) {
    await writeAuditLog(supabase, {
      actorId: actor.id,
      action: "api_key.revoked",
      entityType: "api_key",
      entityId: keyId,
    });
    revalidatePath("/settings/api-keys");
  }

  return { error: error?.message };
}
