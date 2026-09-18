import Link from "next/link";
import {
  CheckCircle2,
  FileWarning,
  GraduationCap,
  Receipt,
  Send,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAdmissionsFunnel, getAdmissionsKpis } from "@/features/admissions/data";
import { cn } from "@/lib/utils";

function Kpi({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: number; icon: LucideIcon; tone?: "neutral" | "success" | "warning" }) {
  const t = tone === "success" ? "bg-success/10 text-success" : tone === "warning" ? "bg-warning/15 text-warning-foreground" : "bg-secondary text-muted-foreground";
  return (
    <Card className="gap-0 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex size-7 items-center justify-center rounded-md", t)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </Card>
  );
}

export default async function AdmissionsPage() {
  await requireStaff(["super_admin", "admissions_manager"]);
  const supabase = await createClient();
  const [kpis, funnel] = await Promise.all([
    getAdmissionsKpis(supabase),
    getAdmissionsFunnel(supabase),
  ]);
  const max = Math.max(1, ...funnel.map((s) => s.count));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admissions</h1>
          <p className="text-sm text-muted-foreground">Applicants, documents and admissions at a glance.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admissions/students">
            <UsersRound /> View applicants
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total Applicants" value={kpis.total} icon={UsersRound} />
        <Kpi label="Submitted" value={kpis.submitted} icon={Send} />
        <Kpi label="Documents Pending" value={kpis.documentsPending} icon={FileWarning} tone="warning" />
        <Kpi label="Admitted" value={kpis.admitted} icon={CheckCircle2} tone="success" />
        <Kpi label="Fee Pending" value={kpis.feePending} icon={Receipt} tone="warning" />
        <Kpi label="Enrolled" value={kpis.enrolled} icon={GraduationCap} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Funnel</CardTitle>
          <CardDescription>Applications reaching each stage of the pipeline.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {funnel.map((stage, i) => {
            const prev = i > 0 ? funnel[i - 1].count : null;
            const dropoff = prev && prev > 0 ? Math.round(((prev - stage.count) / prev) * 100) : null;
            const width = Math.max(2, Math.round((stage.count / max) * 100));
            return (
              <div key={stage.label} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="flex items-baseline gap-2">
                    {dropoff != null && dropoff > 0 && (
                      <span className="text-xs text-muted-foreground">−{dropoff}%</span>
                    )}
                    <span className="font-semibold tabular-nums">{stage.count}</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
