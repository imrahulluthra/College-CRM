import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadStatusBadge } from "./lead-status-badge";
import type { getLeadsList } from "./list-data";
import type { getProfilesMap, getProgramsMap, getLeadSourcesMap } from "./lookups";

export function LeadsTable({
  leads,
  programs,
  sources,
  profiles,
}: {
  leads: Awaited<ReturnType<typeof getLeadsList>>["leads"];
  programs: Awaited<ReturnType<typeof getProgramsMap>>;
  sources: Awaited<ReturnType<typeof getLeadSourcesMap>>;
  profiles: Awaited<ReturnType<typeof getProfilesMap>>;
}) {
  if (leads.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No leads match these filters.
      </p>
    );
  }

  return (
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
            <TableCell>{(lead.source_id && sources.get(lead.source_id)?.name) ?? "—"}</TableCell>
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
  );
}
