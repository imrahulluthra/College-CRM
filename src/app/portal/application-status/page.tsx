import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyApplication, getMyDocuments, getMyPayment, getMyProfile, profileComplete } from "@/features/portal/data";
import { applicationStatusLabel, applicationStatusVariant } from "@/features/portal/application-status";
import { PageHeader } from "@/features/portal/page-header";
import { cn } from "@/lib/utils";

type StepState = "done" | "current" | "upcoming" | "rejected";

export default async function ApplicationStatusPage() {
  const user = await requireStudent();
  const supabase = await createClient();
  const application = await getMyApplication(supabase, user.id);
  if (!application) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No application found.
        </CardContent>
      </Card>
    );
  }

  const [profile, docs, payment] = await Promise.all([
    getMyProfile(supabase, application.id),
    getMyDocuments(supabase, application.id),
    getMyPayment(supabase, application.id),
  ]);

  const requiredDocs = docs.filter((d) => d.type.is_required);
  const allDocsUploaded = requiredDocs.length > 0 && requiredDocs.every((d) => d.doc);
  const submitted = application.status !== "DRAFT";
  const rejected = application.status === "REJECTED";
  const approved = ["APPROVED", "ADMITTED", "ENROLLED"].includes(application.status);
  const underReview = ["SUBMITTED", "UNDER_REVIEW"].includes(application.status);

  const steps: { label: string; description: string; state: StepState }[] = [
    { label: "Application started", description: "Your student account was created.", state: "done" },
    {
      label: "Application details completed",
      description: "Personal and academic details filled in.",
      state: profileComplete(profile) ? "done" : submitted ? "done" : "current",
    },
    {
      label: "Documents submitted",
      description: `${requiredDocs.filter((d) => d.doc).length}/${requiredDocs.length} required documents uploaded.`,
      state: allDocsUploaded ? "done" : submitted ? "done" : "upcoming",
    },
    {
      label: "Fee submitted",
      description: payment?.status === "PAID" ? "Fee paid." : "Fee pending — pay at the office for now.",
      state: payment?.status === "PAID" ? "done" : "upcoming",
    },
    {
      label: "Application submitted",
      description: application.submitted_at
        ? `Submitted on ${new Date(application.submitted_at).toLocaleDateString()}.`
        : "Submit from the Fee Details step.",
      state: submitted ? "done" : "upcoming",
    },
    {
      label: "Under review",
      description: "The admissions team is reviewing your application.",
      state: approved || rejected ? "done" : underReview ? "current" : "upcoming",
    },
    {
      label: rejected ? "Rejected" : "Approved",
      description: rejected
        ? "Please contact the admissions office."
        : "Congratulations — your application is approved.",
      state: approved ? "done" : rejected ? "rejected" : "upcoming",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageHeader title="Application Status" description="Track where your application is in the process." />
        <Badge variant={applicationStatusVariant(application.status)}>
          {applicationStatusLabel(application.status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative flex flex-col gap-6">
            {steps.map((step, i) => {
              const last = i === steps.length - 1;
              return (
                <li key={step.label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                        step.state === "done" && "border-success bg-success text-success-foreground",
                        step.state === "current" && "border-primary bg-primary/10 text-primary",
                        step.state === "rejected" && "border-destructive bg-destructive text-destructive-foreground",
                        step.state === "upcoming" && "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {step.state === "done" && <Check className="size-4" />}
                      {step.state === "rejected" && <X className="size-4" />}
                      {(step.state === "current" || step.state === "upcoming") && (
                        <span className="text-xs font-semibold">{i + 1}</span>
                      )}
                    </span>
                    {!last && (
                      <span
                        className={cn(
                          "mt-1 w-0.5 flex-1",
                          step.state === "done" ? "bg-success/40" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                  <div className={cn("pb-1", last ? "" : "pb-4")}>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        step.state === "upcoming" && "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
