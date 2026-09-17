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

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning";

export function leadStatusVariant(status: LeadStatus): BadgeVariant {
  switch (status) {
    case "ADMITTED":
    case "ENROLLED":
      return "success";
    case "NEW":
      return "secondary";
    case "NOT_INTERESTED":
    case "UNQUALIFIED":
    case "WRONG_NUMBER":
    case "DUPLICATE":
    case "LOST":
      return "destructive";
    case "NURTURE":
      return "outline";
    case "OFFER_SENT":
    case "FEE_PENDING":
    case "DOCUMENTS_PENDING":
      return "warning";
    default:
      return "default";
  }
}
