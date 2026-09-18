import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  FolderOpen,
  LifeBuoy,
  ListChecks,
  Receipt,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth";
import { COLLEGE_NAME } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import {
  getMyApplication,
  getMyDocuments,
  getMyPayment,
  getMyProfile,
  profileComplete,
} from "@/features/portal/data";
import {
  applicationStatusLabel,
  applicationStatusVariant,
} from "@/features/portal/application-status";
import { cn } from "@/lib/utils";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  tone = "neutral",
  soon = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  href?: string;
  tone?: "neutral" | "success" | "warning";
  soon?: boolean;
}) {
  const toneCls = {
    neutral: "bg-secondary text-muted-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
  }[tone];

  const inner = (
    <Card className={cn("gap-0 p-4", href && "transition-all hover:-translate-y-0.5 hover:shadow-soft-lg")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex size-7 items-center justify-center rounded-md", toneCls)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-lg font-semibold">
        {value}
        {soon && <span className="ml-1 align-middle text-[10px] font-medium text-muted-foreground">Soon</span>}
      </p>
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function PortalHome() {
  const user = await requireStudent();
  const supabase = await createClient();
  const application = await getMyApplication(supabase, user.id);

  if (!application) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No application found for your account. Please contact the admissions office.
        </CardContent>
      </Card>
    );
  }

  const [profile, docs, payment, program, lead, cycle] = await Promise.all([
    getMyProfile(supabase, application.id),
    getMyDocuments(supabase, application.id),
    getMyPayment(supabase, application.id),
    application.program_id
      ? supabase.from("programs").select("name").eq("id", application.program_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("leads").select("full_name").eq("id", application.lead_id).maybeSingle(),
    application.admission_cycle_id
      ? supabase.from("admission_cycles").select("name").eq("id", application.admission_cycle_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const requiredDocs = docs.filter((d) => d.type.is_required);
  const approvedRequired = requiredDocs.filter((d) => d.doc?.status === "APPROVED").length;
  const uploadedRequired = requiredDocs.filter((d) => d.doc).length;
  const pendingFee = payment ? Number(payment.amount_total) - Number(payment.amount_paid) : 0;

  const steps = [
    { label: "Personal & academic details", done: profileComplete(profile) },
    { label: "Application submitted", done: application.status !== "DRAFT" },
    {
      label: `Documents (${approvedRequired}/${requiredDocs.length} approved)`,
      done: requiredDocs.length > 0 && approvedRequired === requiredDocs.length,
    },
    { label: "Fee paid", done: payment?.status === "PAID" },
  ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  // Recent activity: derived from real records, not invented.
  const activity: { text: string; date: string }[] = [];
  if (application.submitted_at)
    activity.push({ text: "Application submitted", date: application.submitted_at });
  const latestDoc = [...docs]
    .filter((d) => d.doc)
    .sort((a, b) => (b.doc!.uploaded_at > a.doc!.uploaded_at ? 1 : -1))[0];
  if (latestDoc?.doc)
    activity.push({ text: `Uploaded ${latestDoc.type.name}`, date: latestDoc.doc.uploaded_at });
  activity.push({ text: "Application started", date: application.created_at });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {(lead.data?.full_name ?? user.fullName).split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {program.data?.name ?? "Your application"}
          </p>
        </div>
        <Badge variant={applicationStatusVariant(application.status)}>
          {applicationStatusLabel(application.status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoRow label="Name" value={lead.data?.full_name ?? user.fullName} />
          <InfoRow label="Application ID" value={application.id.slice(0, 8).toUpperCase()} />
          <InfoRow label="Course" value={program.data?.name} />
          <InfoRow label="College" value={COLLEGE_NAME} />
          <InfoRow label="Academic year" value={cycle.data?.name} />
          <InfoRow label="Application status" value={applicationStatusLabel(application.status)} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Fee status"
          value={payment ? (payment.status === "PAID" ? "Paid" : inr(pendingFee) + " due") : "—"}
          icon={Receipt}
          href="/portal/fees"
          tone={payment?.status === "PAID" ? "success" : "warning"}
        />
        <StatCard
          label="Documents"
          value={`${uploadedRequired}/${requiredDocs.length}`}
          icon={FolderOpen}
          href="/portal/documents"
        />
        <StatCard
          label="Application"
          value={applicationStatusLabel(application.status)}
          icon={ListChecks}
          href="/portal/application-status"
        />
        <StatCard label="Attendance" value="—" icon={CalendarCheck} tone="neutral" soon />
        <StatCard label="Assignments" value="—" icon={ClipboardList} tone="neutral" soon />
        <StatCard label="Tickets" value="—" icon={LifeBuoy} tone="neutral" soon />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Application progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative size-28 shrink-0">
              <div
                className="size-28 rounded-full"
                style={{ background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--muted) 0deg)` }}
              />
              <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-card">
                <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
                <span className="text-[11px] text-muted-foreground">{completed}/{steps.length} done</span>
              </div>
            </div>
            <ul className="flex w-full flex-1 flex-col gap-2.5">
              {steps.map((step) => (
                <li key={step.label} className="flex items-center gap-2.5 text-sm">
                  {step.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className={step.done ? "font-medium" : "text-muted-foreground"}>{step.label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <FileText className="size-3 text-muted-foreground" />
                  </span>
                  <div>
                    <p className="text-sm">{a.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.date).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Quick actions</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Button asChild variant="outline">
            <Link href="/portal/fees">
              <Receipt /> View Fees
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/portal/documents">
              <FolderOpen /> Documents
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/portal/application-status">
              <ListChecks /> Status
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/portal/tickets">
              <LifeBuoy /> Raise a Ticket
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
