"use client";

import { useActionState, useState } from "react";
import { Copy, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { convertLeadToApplicant, type ConvertState } from "@/app/(app)/leads/convert-action";

const initial: ConvertState = {};

export function ConvertApplicantButton({ leadId }: { leadId: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(convertLeadToApplicant, initial);

  const done = !!state.success;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        <GraduationCap className="size-4" />
        Convert to Applicant
      </Button>

      <Dialog open={confirmOpen && !done} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to applicant?</DialogTitle>
            <DialogDescription>
              This creates a student login for this lead&apos;s email and starts their
              application. The lead&apos;s history is kept.
            </DialogDescription>
          </DialogHeader>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <form action={formAction}>
              <input type="hidden" name="leadId" value={leadId} />
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Create student login
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={done} onOpenChange={() => window.location.reload()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Applicant created</DialogTitle>
            <DialogDescription>
              Share these credentials with {state.success?.email} securely. The temporary
              password is shown only once.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted p-3">
            <code className="text-sm break-all">{state.success?.tempPassword}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => {
                if (state.success) {
                  navigator.clipboard.writeText(state.success.tempPassword);
                  toast.success("Password copied");
                }
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
