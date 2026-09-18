"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, Eye, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDocumentUrl } from "@/app/portal/documents/actions";
import { reviewDocument, type ReviewState } from "@/app/(app)/leads/review-action";
import type { DocQueueRow } from "@/features/admissions/data";
import type { DocumentStatus } from "@/types/database";

const initial: ReviewState = {};

const STATUS: Record<DocumentStatus, { label: string; variant: "secondary" | "success" | "destructive" }> = {
  UPLOADED: { label: "Awaiting review", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export function DocQueueTable({ rows }: { rows: DocQueueRow[] }) {
  const [state, formAction, isPending] = useActionState(reviewDocument, initial);
  const [isViewing, startView] = useTransition();
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [handledOk, setHandledOk] = useState(state.ok);
  if (state.ok !== handledOk) {
    setHandledOk(state.ok);
    if (state.ok) setRejectingId(null);
  }

  useEffect(() => {
    if (state.ok) toast.success("Review saved");
    else if (state.error) toast.error(state.error);
  }, [state.ok, state.error]);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nothing here.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Applicant</TableHead>
          <TableHead>Document</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.docId}>
            <TableCell className="font-medium">
              <Link href={`/leads/${row.leadId}`} className="hover:underline">
                {row.applicantName}
              </Link>
            </TableCell>
            <TableCell>{row.typeName}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(row.uploadedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS[row.status].variant}>{STATUS[row.status].label}</Badge>
            </TableCell>
            <TableCell>
              {rejectingId === row.docId ? (
                <form action={formAction} className="flex items-center justify-end gap-2">
                  <input type="hidden" name="documentId" value={row.docId} />
                  <input type="hidden" name="leadId" value={row.leadId} />
                  <input type="hidden" name="decision" value="REJECTED" />
                  <Input name="reason" placeholder="Reason" required className="h-8 w-40" />
                  <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
                    {isPending && <Loader2 className="animate-spin" />}
                    Reject
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isViewing}
                    onClick={() =>
                      startView(async () => {
                        const res = await getDocumentUrl(row.docId);
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
                      <input type="hidden" name="leadId" value={row.leadId} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        className="text-success hover:bg-success/10 hover:text-success"
                      >
                        <Check className="size-4" /> Approve
                      </Button>
                    </form>
                  )}
                  {row.status !== "REJECTED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRejectingId(row.docId)}
                    >
                      <X className="size-4" /> Reject
                    </Button>
                  )}
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
