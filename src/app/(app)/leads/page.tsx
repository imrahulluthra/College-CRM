import { Card, CardContent } from "@/components/ui/card";
import { requireUser, isAdminOrManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLeadsList, LEADS_PAGE_SIZE, type LeadListFilters } from "@/features/leads/list-data";
import { getActivePrograms, getCounselors, getLeadSourceOptions, getProfilesMap, getProgramsMap, getLeadSourcesMap } from "@/features/leads/lookups";
import { LeadFiltersBar } from "@/features/leads/filters-bar";
import { LeadsTable } from "@/features/leads/leads-table";
import { LeadsPagination } from "@/features/leads/pagination";
import { CreateLeadForm } from "@/features/leads/create-lead-form";
import type { LeadStatus } from "@/types/database";

export default async function LeadsPage(props: PageProps<"/leads">) {
  const user = await requireUser();
  const supabase = await createClient();
  const sp = await props.searchParams;

  const filters: LeadListFilters = {
    q: typeof sp.q === "string" ? sp.q : undefined,
    status: typeof sp.status === "string" ? (sp.status as LeadStatus) : undefined,
    sourceId: typeof sp.source === "string" ? sp.source : undefined,
    programId: typeof sp.program === "string" ? sp.program : undefined,
    counselorId: typeof sp.counselor === "string" ? sp.counselor : undefined,
    page: typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1,
  };

  const [{ leads, total }, programs, sources, profiles, programOptions, sourceOptions, counselors] =
    await Promise.all([
      getLeadsList(supabase, filters),
      getProgramsMap(supabase),
      getLeadSourcesMap(supabase),
      getProfilesMap(supabase),
      getActivePrograms(supabase),
      getLeadSourceOptions(supabase),
      getCounselors(supabase),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {isAdminOrManager(user) ? "All leads." : "Leads assigned to you."}
          </p>
        </div>
        <CreateLeadForm
          programs={programOptions}
          sources={sourceOptions.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>

      <LeadFiltersBar
        programs={programOptions}
        sources={sourceOptions.map((s) => ({ id: s.id, name: s.name }))}
        counselors={counselors.map((c) => ({ id: c.id, name: c.full_name }))}
        showCounselorFilter={isAdminOrManager(user)}
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <LeadsTable leads={leads} programs={programs} sources={sources} profiles={profiles} />
          <LeadsPagination
            page={filters.page}
            pageSize={LEADS_PAGE_SIZE}
            total={total}
            searchParams={sp}
          />
        </CardContent>
      </Card>
    </div>
  );
}
