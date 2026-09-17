import type { LeadStatus } from "@/types/database";

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "COUNSELLING",
  "APPLICATION_STARTED",
  "DOCUMENTS_PENDING",
  "APPLICATION_COMPLETE",
  "OFFER_SENT",
  "FEE_PENDING",
  "ADMITTED",
  "ENROLLED",
];

export const LEAD_STATUS_OUTCOMES: LeadStatus[] = [
  "NOT_INTERESTED",
  "UNQUALIFIED",
  "WRONG_NUMBER",
  "DUPLICATE",
  "LOST",
  "NURTURE",
];

export const ALL_LEAD_STATUSES = [...LEAD_STATUS_ORDER, ...LEAD_STATUS_OUTCOMES];

export function leadStatusLabel(status: LeadStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

type StatusTone = "brand" | "success" | "danger" | "warning" | "neutral";

function statusTone(status: LeadStatus): StatusTone {
  switch (status) {
    case "ADMITTED":
    case "ENROLLED":
      return "success";
    case "NEW":
      return "neutral";
    case "NOT_INTERESTED":
    case "UNQUALIFIED":
    case "WRONG_NUMBER":
    case "DUPLICATE":
    case "LOST":
      return "danger";
    case "NURTURE":
      return "neutral";
    case "OFFER_SENT":
    case "FEE_PENDING":
    case "DOCUMENTS_PENDING":
      return "warning";
    default:
      return "brand";
  }
}

/** Soft-tinted pill classes + dot color, keyed by status. Reads calmer than a solid badge in dense tables. */
export function leadStatusPill(status: LeadStatus): { pill: string; dot: string } {
  switch (statusTone(status)) {
    case "success":
      return { pill: "bg-success/10 text-success ring-1 ring-inset ring-success/20", dot: "bg-success" };
    case "danger":
      return {
        pill: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
        dot: "bg-destructive",
      };
    case "warning":
      return { pill: "bg-warning/15 text-warning-foreground ring-1 ring-inset ring-warning/30", dot: "bg-warning" };
    case "neutral":
      return { pill: "bg-secondary text-secondary-foreground ring-1 ring-inset ring-border", dot: "bg-muted-foreground" };
    default:
      return { pill: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20", dot: "bg-primary" };
  }
}
