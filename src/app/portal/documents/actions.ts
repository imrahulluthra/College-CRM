"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser, requireStudent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);

export interface UploadState {
  error?: string;
  ok?: boolean;
}

export async function uploadDocument(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const user = await requireStudent();
  const documentTypeId = String(formData.get("documentTypeId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (file.size > MAX_BYTES) return { error: "File must be 5 MB or smaller." };
  const ext = ALLOWED.get(file.type);
  if (!ext) return { error: "Only PDF, JPG, or PNG files are allowed." };

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("id")
    .eq("student_user_id", user.id)
    .maybeSingle();
  if (!application) return { error: "No application found." };

  const { data: existing } = await supabase
    .from("student_documents")
    .select("id, status")
    .eq("application_id", application.id)
    .eq("document_type_id", documentTypeId)
    .maybeSingle();
  if (existing?.status === "APPROVED") {
    return { error: "This document is already approved and cannot be replaced." };
  }

  // Service-role client for storage: the bucket is private with no direct-access
  // policies, so every read/write is mediated here after the ownership check above.
  const admin = createAdminClient();
  const path = `${application.id}/${documentTypeId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("student-documents")
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) return { error: "Upload failed. Try again." };

  const row = {
    application_id: application.id,
    document_type_id: documentTypeId,
    storage_path: path,
    file_name: file.name,
    status: "UPLOADED" as const,
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    uploaded_at: new Date().toISOString(),
  };
  const { error: dbError } = existing
    ? await admin.from("student_documents").update(row).eq("id", existing.id)
    : await admin.from("student_documents").insert(row);
  if (dbError) return { error: "Saved the file but could not record it. Contact support." };

  revalidatePath("/portal/documents");
  revalidatePath("/portal");
  return { ok: true };
}

/** Returns a short-lived signed URL for a document the caller may access (own student, or any staff). */
export async function getDocumentUrl(documentId: string): Promise<{ url?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const supabase = await createClient();
  // RLS lets students read only their own documents and staff read all, so a
  // successful select here is the authorization check.
  const { data: doc } = await supabase
    .from("student_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { error: "Not found." };

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("student-documents")
    .createSignedUrl(doc.storage_path, 120);
  if (error || !data) return { error: "Could not open the file." };
  return { url: data.signedUrl };
}
