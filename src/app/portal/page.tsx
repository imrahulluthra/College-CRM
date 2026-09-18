import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth";
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

  const [profile, docs, payment, program] = await Promise.all([
    getMyProfile(supabase, application.id),
    getMyDocuments(supabase, application.id),
    getMyPayment(supabase, application.id),
    application.program_id
      ? supabase.from("programs").select("name").eq("id", application.program_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const requiredDocs = docs.filter((d) => d.type.is_required);
  const approvedRequired = requiredDocs.filter((d) => d.doc?.status === "APPROVED").length;
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {user.fullName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">{program.data?.name ?? "Your application"}</p>
        </div>
        <Badge variant={applicationStatusVariant(application.status)}>
          {applicationStatusLabel(application.status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application progress</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative size-28 shrink-0">
            <div
              className="size-28 rounded-full"
              style={{
                background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--muted) 0deg)`,
              }}
            />
            <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-card">
              <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
              <span className="text-[11px] text-muted-foreground">
                {completed}/{steps.length} done
              </span>
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
                <span className={step.done ? "font-medium text-foreground" : "text-muted-foreground"}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button asChild variant="outline" className="h-auto justify-start py-3">
          <Link href="/portal/application">
            <span className="flex flex-col items-start">
              <span className="font-medium">My Application</span>
              <span className="text-xs text-muted-foreground">Personal & academic details</span>
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-3">
          <Link href="/portal/documents">
            <span className="flex flex-col items-start">
              <span className="font-medium">Documents</span>
              <span className="text-xs text-muted-foreground">
                {approvedRequired}/{requiredDocs.length} approved
              </span>
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-3">
          <Link href="/portal/fees">
            <span className="flex flex-col items-start">
              <span className="font-medium">Fees</span>
              <span className="text-xs text-muted-foreground">
                {payment ? payment.status[0] + payment.status.slice(1).toLowerCase() : "—"}
              </span>
            </span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
