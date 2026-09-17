import { requireUser, isAdminOrManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getCounselorWorkload,
  getFunnel,
  getKpis,
  getLeadSources,
  getRecentLeads,
  getTodaysOperations,
} from "@/features/dashboard/data";
import { getProfilesMap, getProgramsMap, getLeadSourcesMap } from "@/features/leads/lookups";
import { KpiCards } from "@/features/dashboard/kpi-cards";
import { FunnelChart } from "@/features/dashboard/funnel-chart";
import { LeadSourcesPanel } from "@/features/dashboard/lead-sources-panel";
import { CounselorWorkloadTable } from "@/features/dashboard/counselor-workload-table";
import { TodaysOperations } from "@/features/dashboard/todays-operations";
import { RecentLeadsTable } from "@/features/dashboard/recent-leads-table";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [kpis, funnel, sources, ops, recentLeads, programs, sourceMap, profiles, workload] =
    await Promise.all([
      getKpis(supabase),
      getFunnel(supabase),
      getLeadSources(supabase),
      getTodaysOperations(supabase),
      getRecentLeads(supabase),
      getProgramsMap(supabase),
      getLeadSourcesMap(supabase),
      getProfilesMap(supabase),
      isAdminOrManager(user) ? getCounselorWorkload(supabase) : Promise.resolve([]),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          What&apos;s happening with admissions right now.
        </p>
      </div>

      <KpiCards kpis={kpis} />

      <TodaysOperations ops={ops} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FunnelChart funnel={funnel} />
        </div>
        <LeadSourcesPanel sources={sources} />
      </div>

      {isAdminOrManager(user) && <CounselorWorkloadTable workload={workload} />}

      <RecentLeadsTable
        leads={recentLeads}
        programs={programs}
        sources={sourceMap}
        profiles={profiles}
      />
    </div>
  );
}
