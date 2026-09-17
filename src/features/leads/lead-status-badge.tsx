import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types/database";
import { leadStatusLabel, leadStatusPill } from "./status";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { pill, dot } = leadStatusPill(status);
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        pill
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} />
      {leadStatusLabel(status)}
    </span>
  );
}
