import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActivePrograms, getCounselors } from "@/features/leads/lookups";
import {
  getApplicantsList,
  APPLICANTS_PAGE_SIZE,
  type ApplicantFilters,
} from "@/features/admissions/data";
import { ApplicantsFilters } from "@/features/admissions/applicants-filters";
import {
  applicationStatusLabel,
  applicationStatusVariant,
} from "@/features/portal/application-status";
import type { ApplicationStatus } from "@/types/database";

export default async function ApplicantsPage(props: PageProps<"/admissions/students">) {
  await requireStaff(["super_admin", "admissions_manager", "document_reviewer"]);
  const supabase = await createClient();
  const sp = await props.searchParams;

  const filters: ApplicantFilters = {
    q: typeof sp.q === "string" ? sp.q : undefined,
    status: typeof sp.status === "string" ? (sp.status as ApplicationStatus) : undefined,
    programId: typeof sp.program === "string" ? sp.program : undefined,
    counselorId: typeof sp.counselor === "string" ? sp.counselor : undefined,
    page: typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1,
  };

  const [{ rows, total }, programs, counselors] = await Promise.all([
    getApplicantsList(supabase, filters),
    getActivePrograms(supabase),
    getCounselors(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Applicants</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who has started an application. Click a row for the full record.
        </p>
      </div>

      <ApplicantsFilters
        programs={programs}
        counselors={counselors.map((c) => ({ id: c.id, name: c.full_name }))}
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No applicants match these filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.applicationId}>
                    <TableCell className="font-medium">
                      <Link href={`/leads/${r.leadId}`} className="hover:underline">
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell>{r.programName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={applicationStatusVariant(r.status)}>
                        {applicationStatusLabel(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {r.docsTotal > 0 ? `${r.docsApproved}/${r.docsTotal} approved` : "—"}
                    </TableCell>
                    <TableCell>
                      {r.feeStatus ? (
                        <Badge variant={r.feeStatus === "PAID" ? "success" : "secondary"}>
                          {r.feeStatus[0] + r.feeStatus.slice(1).toLowerCase()}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination
            page={filters.page}
            pageSize={APPLICANTS_PAGE_SIZE}
            total={total}
            searchParams={sp}
            basePath="/admissions/students"
          />
        </CardContent>
      </Card>
    </div>
  );
}
