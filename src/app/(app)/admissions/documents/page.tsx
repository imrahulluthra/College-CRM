import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDocumentQueue, getDocumentQueueCounts } from "@/features/admissions/data";
import { DocQueueTable } from "@/features/admissions/doc-queue-table";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/types/database";

const TABS: { key: DocumentStatus; label: string }[] = [
  { key: "UPLOADED", label: "Pending review" },
  { key: "REJECTED", label: "Rejected" },
  { key: "APPROVED", label: "Approved" },
];

export default async function DocumentReviewPage(props: PageProps<"/admissions/documents">) {
  await requireStaff(["super_admin", "admissions_manager", "document_reviewer"]);
  const supabase = await createClient();
  const sp = await props.searchParams;
  const status = (typeof sp.status === "string" && ["UPLOADED", "APPROVED", "REJECTED"].includes(sp.status)
    ? sp.status
    : "UPLOADED") as DocumentStatus;

  const [rows, counts] = await Promise.all([
    getDocumentQueue(supabase, status),
    getDocumentQueueCounts(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Document Review</h1>
        <p className="text-sm text-muted-foreground">
          Review documents uploaded by applicants across all applications.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const active = tab.key === status;
          return (
            <Link
              key={tab.key}
              href={`/admissions/documents?status=${tab.key}`}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  active ? "bg-primary/15" : "bg-muted"
                )}
              >
                {counts[tab.key]}
              </span>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent>
          <DocQueueTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
