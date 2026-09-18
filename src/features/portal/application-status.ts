import type { ApplicationStatus } from "@/types/database";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "FEE_PENDING",
  "ADMITTED",
  "ENROLLED",
  "REJECTED",
  "WITHDRAWN",
];

export function applicationStatusLabel(status: ApplicationStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

type Variant = "secondary" | "success" | "warning" | "destructive";

export function applicationStatusVariant(status: ApplicationStatus): Variant {
  switch (status) {
    case "APPROVED":
    case "ADMITTED":
    case "ENROLLED":
      return "success";
    case "FEE_PENDING":
      return "warning";
    case "REJECTED":
    case "WITHDRAWN":
      return "destructive";
    default:
      return "secondary";
  }
}
