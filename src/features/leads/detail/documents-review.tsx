"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, Eye, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDocumentUrl } from "@/app/portal/documents/actions";
import { reviewDocument, type ReviewState } from "@/app/(app)/leads/review-action";
import type { DocumentStatus } from "@/types/database";

const initial: ReviewState = {};

const STATUS: Record<DocumentStatus, { label: string; variant: "secondary" | "success" | "destructive" }> = {
  UPLOADED: { label: "Awaiting review", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export interface ReviewRow {
  typeName: string;
  required: boolean;
  docId: string | null;
  status: DocumentStatus | null;
  fileName: string | null;
}

export function DocumentsReview({ rows, leadId }: { rows: ReviewRow[]; leadId: string }) {
  const [state, formAction, isPending] = useActionState(reviewDocument, initial);
  const [isViewing, startView] = useTransition();
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Close the reject form once a review lands. Render-time adjustment (not an
  // effect) so it fires exactly once per action result.
  const [handledOk, setHandledOk] = useState(state.ok);
  if (state.ok !== handledOk) {
    setHandledOk(state.ok);
    if (state.ok) setRejectingId(null);
  }

  useEffect(() => {
    if (state.ok) toast.success("Review saved");
    else if (state.error) toast.error(state.error);
  }, [state.ok, state.error]);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.typeName} className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {row.typeName}
              {row.required && <span className="ml-1 text-destructive">*</span>}
            </p>
            {row.status ? (
              <Badge variant={STATUS[row.status].variant}>{STATUS[row.status].label}</Badge>
            ) : (
              <Badge variant="outline">Not uploaded</Badge>
            )}
          </div>

          {row.docId && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isViewing}
                onClick={() =>
                  startView(async () => {
                    const res = await getDocumentUrl(row.docId!);
                    if (res.url) window.open(res.url, "_blank", "noopener");
                    else toast.error(res.error ?? "Could not open the file.");
                  })
                }
              >
                <Eye className="size-4" /> View
              </Button>

              {row.status !== "APPROVED" && (
                <form action={formAction} className="contents">
                  <input type="hidden" name="documentId" value={row.docId} />
                  <input type="hidden" name="leadId" value={leadId} />
                  <input type="hidden" name="decision" value="APPROVED" />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    className="text-success hover:bg-success/10 hover:text-success"
                  >
                    <Check className="size-4" /> Approve
                  </Button>
                </form>
              )}

              {row.status !== "REJECTED" && rejectingId !== row.docId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setRejectingId(row.docId)}
                >
                  <X className="size-4" /> Reject
                </Button>
              )}
            </div>
          )}

          {rejectingId && rejectingId === row.docId && (
            <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="documentId" value={rejectingId} />
              <input type="hidden" name="leadId" value={leadId} />
              <input type="hidden" name="decision" value="REJECTED" />
              <Input name="reason" placeholder="Reason (shown to the student)" required />
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  Reject
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
