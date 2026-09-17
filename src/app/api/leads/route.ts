import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { hashApiKey } from "@/lib/api-keys";
import { writeAuditLog } from "@/lib/audit/log";
import { normalizePhone } from "@/lib/phone";
import { isRateLimited } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint: the college's existing website posts its admission-enquiry
// form here. No Supabase session exists at this point, so authorization is a
// per-integration API key (see src/app/(app)/settings/api-keys) checked by
// hash, plus an optional Origin allowlist -- never Supabase RLS. Full
// integration guide: docs/WEBSITE-INTEGRATION.md.

const leadSchema = z.object({
  name: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(6).max(20),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  program: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  source: z.string().trim().max(120).optional(),
  campaign: z.string().trim().max(200).optional(),
  utm_source: z.string().trim().max(200).optional(),
  utm_medium: z.string().trim().max(200).optional(),
  utm_campaign: z.string().trim().max(200).optional(),
  utm_content: z.string().trim().max(200).optional(),
  utm_term: z.string().trim().max(200).optional(),
  landing_page: z.string().trim().max(500).optional(),
});

function resolveAllowedOrigin(request: NextRequest): string | null {
  const configured = process.env.LEAD_CAPTURE_ALLOWED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = request.headers.get("origin");

  if (!configured || configured.length === 0) return origin ?? "*";
  if (origin && configured.includes(origin)) return origin;
  return null;
}

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = resolveAllowedOrigin(request);
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

async function parseBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as Record<string, unknown>;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }

  return {};
}

type AdminClient = ReturnType<typeof createAdminClient>;

// Avoids interpolating unvalidated user input into a PostgREST `.or()`
// filter string (which is a filter-injection risk); tries an exact slug
// match first, falling back to a case-insensitive name match.
async function resolveProgramId(
  admin: AdminClient,
  programHint: string | undefined
): Promise<string | null> {
  if (!programHint) {
    const { data } = await admin.from("programs").select("id").eq("is_active", true).limit(2);
    return data && data.length === 1 ? data[0].id : null;
  }

  const bySlug = await admin
    .from("programs")
    .select("id")
    .eq("slug", programHint.toLowerCase())
    .maybeSingle();
  if (bySlug.data) return bySlug.data.id;

  const byName = await admin.from("programs").select("id").ilike("name", programHint).maybeSingle();
  return byName.data?.id ?? null;
}

export async function POST(request: NextRequest) {
  const origin = resolveAllowedOrigin(request);
  const headers = corsHeaders(origin);

  if (origin === null) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403, headers });
  }

  const body = await parseBody(request);

  const providedKey =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    (typeof body.api_key === "string" ? body.api_key : null);

  if (!providedKey) {
    return NextResponse.json({ error: "Missing API key." }, { status: 401, headers });
  }

  const admin = createAdminClient();
  const { data: apiKey } = await admin
    .from("api_keys")
    .select("id, is_active")
    .eq("key_hash", hashApiKey(providedKey))
    .maybeSingle();

  if (!apiKey || !apiKey.is_active) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401, headers });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`${apiKey.id}:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission.", details: parsed.error.flatten().fieldErrors },
      { status: 400, headers }
    );
  }

  const data = parsed.data;
  const phoneNormalized = normalizePhone(data.phone);
  if (phoneNormalized.length !== 10) {
    return NextResponse.json({ error: "Invalid phone number." }, { status: 400, headers });
  }

  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id);

  // ── Duplicate check: same person moving through the funnel again, not a
  // new person -- see "IMPORTANT DATA PRINCIPLE" in the roadmap / docs/DATABASE.md.
  const { data: existingLead } = await admin
    .from("leads")
    .select("id, email, city, state")
    .eq("phone_normalized", phoneNormalized)
    .maybeSingle();

  if (existingLead) {
    await admin
      .from("leads")
      .update({
        last_activity_at: new Date().toISOString(),
        email: existingLead.email ?? (data.email || null),
        city: existingLead.city ?? data.city ?? null,
        state: existingLead.state ?? data.state ?? null,
      })
      .eq("id", existingLead.id);

    await admin.from("lead_activities").insert({
      lead_id: existingLead.id,
      activity_type: "duplicate_submission",
      description: "Website form submitted again by an existing lead.",
      metadata: { ...data, api_key_id: apiKey.id },
    });

    return NextResponse.json(
      { success: true, duplicate: true, leadId: existingLead.id },
      { status: 200, headers }
    );
  }

  const [program, { data: source }] = await Promise.all([
    resolveProgramId(admin, data.program),
    data.source
      ? admin.from("lead_sources").select("id").ilike("name", data.source).maybeSingle()
      : admin.from("lead_sources").select("id").eq("name", "Website").maybeSingle(),
  ]);

  let admissionCycleId: string | null = null;
  if (program) {
    const { data: cycle } = await admin
      .from("admission_cycles")
      .select("id")
      .eq("program_id", program)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    admissionCycleId = cycle?.id ?? null;
  }

  const { data: newLead, error: insertError } = await admin
    .from("leads")
    .insert({
      full_name: data.name,
      phone: data.phone,
      email: data.email || null,
      city: data.city ?? null,
      state: data.state ?? null,
      program_id: program,
      admission_cycle_id: admissionCycleId,
      source_id: source?.id ?? null,
      campaign: data.campaign ?? null,
      utm_source: data.utm_source ?? null,
      utm_medium: data.utm_medium ?? null,
      utm_campaign: data.utm_campaign ?? null,
      utm_content: data.utm_content ?? null,
      utm_term: data.utm_term ?? null,
      landing_page: data.landing_page ?? null,
      status: "NEW",
    })
    .select("id")
    .single();

  if (insertError || !newLead) {
    console.error("[api/leads] insert failed", insertError);
    return NextResponse.json({ error: "Could not save the lead." }, { status: 500, headers });
  }

  await Promise.all([
    admin.from("lead_activities").insert({
      lead_id: newLead.id,
      activity_type: "created",
      description: "Lead captured from the college website.",
      metadata: { source: data.source ?? "website" },
    }),
    admin.from("lead_status_history").insert({
      lead_id: newLead.id,
      from_status: null,
      to_status: "NEW",
    }),
    writeAuditLog(admin, {
      action: "lead.created",
      entityType: "lead",
      entityId: newLead.id,
      newValue: { full_name: data.name, phone: data.phone },
      context: { api_key_id: apiKey.id, ip },
    }),
  ]);

  return NextResponse.json(
    { success: true, duplicate: false, leadId: newLead.id },
    { status: 201, headers }
  );
}
