import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadStatusBadge } from "@/features/leads/lead-status-badge";
import type {
  getProfilesMap,
  getProgramsMap,
  getLeadSourcesMap,
} from "@/features/leads/lookups";
import type { getRecentLeads } from "./data";

export function RecentLeadsTable({
  leads,
  programs,
  sources,
  profiles,
}: {
  leads: Awaited<ReturnType<typeof getRecentLeads>>;
  programs: Awaited<ReturnType<typeof getProgramsMap>>;
  sources: Awaited<ReturnType<typeof getLeadSourcesMap>>;
  profiles: Awaited<ReturnType<typeof getProfilesMap>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Leads</CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No leads yet. Connect the website (Settings → Website Integration) or add one manually.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Counselor</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    <Link href={`/leads/${lead.id}`} className="hover:underline">
                      {lead.full_name}
                    </Link>
                  </TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>
                    {(lead.program_id && programs.get(lead.program_id)?.name) ?? "—"}
                  </TableCell>
                  <TableCell>
                    {(lead.source_id && sources.get(lead.source_id)?.name) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell>
                    {(lead.assigned_counselor_id &&
                      profiles.get(lead.assigned_counselor_id)?.full_name) ??
                      "Unassigned"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
