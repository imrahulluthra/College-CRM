import { Mail, MapPin, Phone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Database } from "@/types/database";
import { StatusControl } from "./status-control";
import { AssignControl } from "./assign-control";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

export function LeadHeader({
  lead,
  programName,
  sourceName,
  counselors,
  canAssign,
}: {
  lead: Lead;
  programName: string | null;
  sourceName: string | null;
  counselors: { id: string; full_name: string }[];
  canAssign: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{lead.full_name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" /> {lead.phone}
              </span>
              {lead.email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" /> {lead.email}
                </span>
              )}
              {(lead.city || lead.state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {[lead.city, lead.state].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {programName ?? "No program"} · Source: {sourceName ?? "Unknown"}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <StatusControl leadId={lead.id} status={lead.status} />
            </div>
            {canAssign && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Counselor</span>
                <AssignControl
                  leadId={lead.id}
                  counselorId={lead.assigned_counselor_id}
                  counselors={counselors}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
