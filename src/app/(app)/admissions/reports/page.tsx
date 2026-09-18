import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getAdmissionsReport,
  getDocumentReport,
  getPaymentReport,
  getProgramReport,
} from "@/features/admissions/data";
import { getCounselorWorkload } from "@/features/dashboard/data";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function ReportsPage() {
  await requireStaff(["super_admin", "admissions_manager"]);
  const supabase = await createClient();

  const [funnel, programs, documents, payments, counselors] = await Promise.all([
    getAdmissionsReport(supabase),
    getProgramReport(supabase),
    getDocumentReport(supabase),
    getPaymentReport(supabase),
    getCounselorWorkload(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Live figures aggregated from leads, applications, documents, and payments.
        </p>
      </div>

      {/* Admissions funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Admissions funnel</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Leads" value={String(funnel.leads)} />
          <Stat label="Applicants" value={String(funnel.applicants)} />
          <Stat label="Admitted" value={String(funnel.admitted)} />
          <Stat label="Enrolled" value={String(funnel.enrolled)} />
          <Stat label="Lead → Applicant" value={`${funnel.leadToApplicant}%`} />
          <Stat label="Applicant → Admitted" value={`${funnel.applicantToAdmitted}%`} />
          <Stat label="Lead → Enrolled" value={`${funnel.leadToEnrolled}%`} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-6">
            <Stat label="Total uploaded" value={String(documents.total)} />
            <Stat label="Awaiting review" value={String(documents.UPLOADED)} />
            <Stat label="Approved" value={String(documents.APPROVED)} />
            <Stat label="Rejected" value={String(documents.REJECTED)} />
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Fee collection</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-6">
            <Stat label="Billed" value={inr(payments.total)} />
            <Stat label="Collected" value={inr(payments.paid)} />
            <Stat label="Outstanding" value={inr(payments.pending)} />
            <Stat label="Fully paid" value={`${payments.paidCount} of ${payments.paidCount + payments.pendingCount}`} />
          </CardContent>
        </Card>
      </div>

      {/* By program */}
      <Card>
        <CardHeader>
          <CardTitle>By program</CardTitle>
        </CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No active programs.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Applications</TableHead>
                  <TableHead className="text-right">Admitted</TableHead>
                  <TableHead className="text-right">Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.leads}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.applications}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.admitted}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.enrolled}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Counselor performance */}
      <Card>
        <CardHeader>
          <CardTitle>Counselor performance</CardTitle>
        </CardHeader>
        <CardContent>
          {counselors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No counselors yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Counselor</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Applications</TableHead>
                  <TableHead className="text-right">Open tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counselors.map((c) => (
                  <TableRow key={c.counselor_id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.assigned_leads}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.pending_leads}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.applications}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.pending_tasks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
