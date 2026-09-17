import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/types/database";
import { leadStatusLabel, leadStatusVariant } from "./status";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={leadStatusVariant(status)}>{leadStatusLabel(status)}</Badge>;
}
