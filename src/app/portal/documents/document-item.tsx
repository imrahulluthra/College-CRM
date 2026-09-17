"use client";

import { useActionState, useEffect, useTransition } from "react";
import { Eye, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DocumentStatus } from "@/types/database";
import { getDocumentUrl, uploadDocument, type UploadState } from "./actions";

const initial: UploadState = {};

const STATUS: Record<DocumentStatus, { label: string; variant: "secondary" | "success" | "destructive" }> = {
  UPLOADED: { label: "Under review", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export interface DocRow {
  typeId: string;
  name: string;
  required: boolean;
  docId: string | null;
  status: DocumentStatus | null;
  fileName: string | null;
  rejectionReason: string | null;
}

export function DocumentItem({ row }: { row: DocRow }) {
  const [state, formAction, isPending] = useActionState(uploadDocument, initial);
  const [isViewing, startView] = useTransition();

  useEffect(() => {
    if (state.ok) toast.success("Uploaded");
    else if (state.error) toast.error(state.error);
  }, [state.ok, state.error]);

  const locked = row.status === "APPROVED";

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {row.name}
            {row.required && <span className="ml-1 text-destructive">*</span>}
          </p>
          {row.fileName && (
            <p className="truncate text-xs text-muted-foreground">{row.fileName}</p>
          )}
        </div>
        {row.status ? (
          <Badge variant={STATUS[row.status].variant}>{STATUS[row.status].label}</Badge>
        ) : (
          <Badge variant="outline">Not uploaded</Badge>
        )}
      </div>

      {row.status === "REJECTED" && row.rejectionReason && (
        <p className="rounded-md bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
          Reason: {row.rejectionReason}
        </p>
      )}

      <div className="flex items-center gap-2">
        {row.docId && (
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
        )}
        {!locked && (
          <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="documentTypeId" value={row.typeId} />
            <input
              type="file"
              name="file"
              accept="application/pdf,image/jpeg,image/png"
              required
              className="text-xs file:mr-2 file:rounded-md file:border file:border-input file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-medium"
            />
            <Button type="submit" size="sm" variant="outline" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Upload className="size-4" />}
              {row.status ? "Replace" : "Upload"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
