import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ApplicationStatus, Database, DocumentStatus } from "@/types/database";

type Client = SupabaseClient<Database>;

// Application statuses that count as "reached this stage or beyond" — used for
// the funnel and KPIs. We derive stages from the current status (there's no
// application_status_history table), which is accurate for a forward-only
// pipeline.
const NON_DRAFT: ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "FEE_PENDING",
  "ADMITTED",
  "ENROLLED",
];
const REACHED_REVIEW: ApplicationStatus[] = ["UNDER_REVIEW", "APPROVED", "FEE_PENDING", "ADMITTED", "ENROLLED"];
const REACHED_APPROVED: ApplicationStatus[] = ["APPROVED", "FEE_PENDING", "ADMITTED", "ENROLLED"];
const REACHED_ADMITTED: ApplicationStatus[] = ["ADMITTED", "ENROLLED"];

async function countApplications(supabase: Client, statuses?: ApplicationStatus[]) {
  let q = supabase.from("applications").select("*", { count: "exact", head: true });
  if (statuses) q = q.in("status", statuses);
  const { count } = await q;
  return count ?? 0;
}

export async function getAdmissionsKpis(supabase: Client) {
  const [total, submitted, admitted, enrolled, docsPendingRes, feePendingRes] = await Promise.all([
    countApplications(supabase),
    countApplications(supabase, NON_DRAFT),
    countApplications(supabase, ["ADMITTED"]),
    countApplications(supabase, ["ENROLLED"]),
    supabase.from("student_documents").select("*", { count: "exact", head: true }).eq("status", "UPLOADED"),
    supabase.from("payments").select("*", { count: "exact", head: true }).in("status", ["PENDING", "PARTIAL"]),
  ]);
  return {
    total,
    submitted,
    admitted,
    enrolled,
    documentsPending: docsPendingRes.count ?? 0,
    feePending: feePendingRes.count ?? 0,
  };
}

export async function getAdmissionsFunnel(supabase: Client) {
  const [applications, submitted, review, approved, admitted, enrolled] = await Promise.all([
    countApplications(supabase),
    countApplications(supabase, NON_DRAFT),
    countApplications(supabase, REACHED_REVIEW),
    countApplications(supabase, REACHED_APPROVED),
    countApplications(supabase, REACHED_ADMITTED),
    countApplications(supabase, ["ENROLLED"]),
  ]);
  return [
    { label: "Applications", count: applications },
    { label: "Submitted", count: submitted },
    { label: "Under Review", count: review },
    { label: "Approved", count: approved },
    { label: "Admitted", count: admitted },
    { label: "Enrolled", count: enrolled },
  ];
}

export interface ApplicantFilters {
  q?: string;
  status?: ApplicationStatus;
  programId?: string;
  counselorId?: string;
  page: number;
}

export const APPLICANTS_PAGE_SIZE = 25;

export interface ApplicantRow {
  applicationId: string;
  leadId: string;
  name: string;
  programName: string | null;
  status: ApplicationStatus;
  docsApproved: number;
  docsTotal: number;
  feeStatus: string | null;
}

export async function getApplicantsList(supabase: Client, filters: ApplicantFilters) {
  // Name lives on leads; if searching, resolve matching lead ids first.
  let leadIdFilter: string[] | null = null;
  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%,*]/g, (c) => `\\${c}`);
    const { data: matched } = await supabase
      .from("leads")
      .select("id")
      .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(500);
    leadIdFilter = (matched ?? []).map((l) => l.id);
    if (leadIdFilter.length === 0) return { rows: [] as ApplicantRow[], total: 0 };
  }

  let q = supabase
    .from("applications")
    .select("id, lead_id, program_id, status", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.status) q = q.eq("status", filters.status);
  if (filters.programId) q = q.eq("program_id", filters.programId);
  if (leadIdFilter) q = q.in("lead_id", leadIdFilter);

  const from = (filters.page - 1) * APPLICANTS_PAGE_SIZE;
  q = q.range(from, from + APPLICANTS_PAGE_SIZE - 1);

  const { data: apps, count } = await q;
  if (!apps || apps.length === 0) return { rows: [] as ApplicantRow[], total: count ?? 0 };

  const appIds = apps.map((a) => a.id);
  const leadIds = [...new Set(apps.map((a) => a.lead_id))];
  const programIds = [...new Set(apps.map((a) => a.program_id).filter(Boolean) as string[])];

  const [{ data: leads }, { data: programs }, { data: docs }, { data: payments }] = await Promise.all([
    supabase.from("leads").select("id, full_name, assigned_counselor_id").in("id", leadIds),
    programIds.length
      ? supabase.from("programs").select("id, name").in("id", programIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("student_documents").select("application_id, status").in("application_id", appIds),
    supabase.from("payments").select("application_id, status").in("application_id", appIds),
  ]);

  const leadMap = new Map((leads ?? []).map((l) => [l.id, l]));
  const programMap = new Map((programs ?? []).map((p) => [p.id, p.name]));
  const paymentMap = new Map((payments ?? []).map((p) => [p.application_id, p.status]));
  const docCounts = new Map<string, { total: number; approved: number }>();
  for (const d of docs ?? []) {
    const c = docCounts.get(d.application_id) ?? { total: 0, approved: 0 };
    c.total += 1;
    if (d.status === "APPROVED") c.approved += 1;
    docCounts.set(d.application_id, c);
  }

  let rows: ApplicantRow[] = apps.map((a) => {
    const c = docCounts.get(a.id) ?? { total: 0, approved: 0 };
    const lead = leadMap.get(a.lead_id);
    return {
      applicationId: a.id,
      leadId: a.lead_id,
      name: lead?.full_name ?? "Unknown",
      programName: a.program_id ? programMap.get(a.program_id) ?? null : null,
      status: a.status,
      docsApproved: c.approved,
      docsTotal: c.total,
      feeStatus: paymentMap.get(a.id) ?? null,
    };
  });

  if (filters.counselorId) {
    const counselorLeadIds = new Set(
      (leads ?? []).filter((l) => l.assigned_counselor_id === filters.counselorId).map((l) => l.id)
    );
    rows = rows.filter((r) => counselorLeadIds.has(r.leadId));
  }

  return { rows, total: count ?? 0 };
}

// ── Document review queue ───────────────────────────────────────────────────
export interface DocQueueRow {
  docId: string;
  leadId: string;
  applicantName: string;
  typeName: string;
  status: DocumentStatus;
  fileName: string;
  uploadedAt: string;
  rejectionReason: string | null;
}

export async function getDocumentQueue(supabase: Client, status: DocumentStatus | "all") {
  let q = supabase
    .from("student_documents")
    .select("id, application_id, document_type_id, status, file_name, uploaded_at, rejection_reason")
    .order("uploaded_at", { ascending: false })
    .limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data: docs } = await q;
  if (!docs || docs.length === 0) return [] as DocQueueRow[];

  const appIds = [...new Set(docs.map((d) => d.application_id))];
  const typeIds = [...new Set(docs.map((d) => d.document_type_id))];
  const [{ data: apps }, { data: types }] = await Promise.all([
    supabase.from("applications").select("id, lead_id").in("id", appIds),
    supabase.from("document_types").select("id, name").in("id", typeIds),
  ]);
  const appToLead = new Map((apps ?? []).map((a) => [a.id, a.lead_id]));
  const leadIds = [...new Set((apps ?? []).map((a) => a.lead_id))];
  const { data: leads } = await supabase.from("leads").select("id, full_name").in("id", leadIds);
  const leadName = new Map((leads ?? []).map((l) => [l.id, l.full_name]));
  const typeName = new Map((types ?? []).map((t) => [t.id, t.name]));

  return docs.map((d) => {
    const leadId = appToLead.get(d.application_id) ?? "";
    return {
      docId: d.id,
      leadId,
      applicantName: leadName.get(leadId) ?? "Unknown",
      typeName: typeName.get(d.document_type_id) ?? "Document",
      status: d.status,
      fileName: d.file_name,
      uploadedAt: d.uploaded_at,
      rejectionReason: d.rejection_reason,
    } satisfies DocQueueRow;
  });
}

export async function getDocumentQueueCounts(supabase: Client) {
  const [uploaded, approved, rejected] = await Promise.all([
    supabase.from("student_documents").select("*", { count: "exact", head: true }).eq("status", "UPLOADED"),
    supabase.from("student_documents").select("*", { count: "exact", head: true }).eq("status", "APPROVED"),
    supabase.from("student_documents").select("*", { count: "exact", head: true }).eq("status", "REJECTED"),
  ]);
  return {
    UPLOADED: uploaded.count ?? 0,
    APPROVED: approved.count ?? 0,
    REJECTED: rejected.count ?? 0,
  };
}

// ── Payments overview ───────────────────────────────────────────────────────
export interface PaymentRow {
  paymentId: string;
  leadId: string;
  applicantName: string;
  label: string;
  total: number;
  paid: number;
  status: string;
  dueDate: string | null;
}

export async function getPaymentsOverview(supabase: Client) {
  const { data: payments } = await supabase
    .from("payments")
    .select("id, application_id, label, amount_total, amount_paid, status, due_date")
    .order("created_at", { ascending: false })
    .limit(300);
  if (!payments || payments.length === 0) return [] as PaymentRow[];

  const appIds = [...new Set(payments.map((p) => p.application_id))];
  const { data: apps } = await supabase.from("applications").select("id, lead_id").in("id", appIds);
  const appToLead = new Map((apps ?? []).map((a) => [a.id, a.lead_id]));
  const leadIds = [...new Set((apps ?? []).map((a) => a.lead_id))];
  const { data: leads } = await supabase.from("leads").select("id, full_name").in("id", leadIds);
  const leadName = new Map((leads ?? []).map((l) => [l.id, l.full_name]));

  return payments.map((p) => {
    const leadId = appToLead.get(p.application_id) ?? "";
    return {
      paymentId: p.id,
      leadId,
      applicantName: leadName.get(leadId) ?? "Unknown",
      label: p.label,
      total: Number(p.amount_total),
      paid: Number(p.amount_paid),
      status: p.status,
      dueDate: p.due_date,
    } satisfies PaymentRow;
  });
}

// ── Reports (real aggregation) ──────────────────────────────────────────────
export async function getAdmissionsReport(supabase: Client) {
  const [leads, applicants, admitted, enrolled] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    countApplications(supabase),
    countApplications(supabase, REACHED_ADMITTED),
    countApplications(supabase, ["ENROLLED"]),
  ]);
  const leadCount = leads.count ?? 0;
  return {
    leads: leadCount,
    applicants,
    admitted,
    enrolled,
    leadToApplicant: leadCount ? Math.round((applicants / leadCount) * 100) : 0,
    applicantToAdmitted: applicants ? Math.round((admitted / applicants) * 100) : 0,
    leadToEnrolled: leadCount ? Math.round((enrolled / leadCount) * 100) : 0,
  };
}

export async function getProgramReport(supabase: Client) {
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (!programs) return [];

  return Promise.all(
    programs.map(async (p) => {
      const [leads, applications, admitted, enrolled] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("program_id", p.id),
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("program_id", p.id),
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("program_id", p.id).in("status", REACHED_ADMITTED),
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("program_id", p.id).eq("status", "ENROLLED"),
      ]);
      return {
        name: p.name,
        leads: leads.count ?? 0,
        applications: applications.count ?? 0,
        admitted: admitted.count ?? 0,
        enrolled: enrolled.count ?? 0,
      };
    })
  );
}

export async function getDocumentReport(supabase: Client) {
  const counts = await getDocumentQueueCounts(supabase);
  const total = counts.UPLOADED + counts.APPROVED + counts.REJECTED;
  return { total, ...counts };
}

export async function getPaymentReport(supabase: Client) {
  const { data } = await supabase.from("payments").select("amount_total, amount_paid, status");
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + Number(r.amount_total), 0);
  const paid = rows.reduce((s, r) => s + Number(r.amount_paid), 0);
  return {
    total,
    paid,
    pending: total - paid,
    paidCount: rows.filter((r) => r.status === "PAID").length,
    pendingCount: rows.filter((r) => r.status !== "PAID").length,
  };
}
