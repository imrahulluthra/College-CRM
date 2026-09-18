"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { submitApplication, type SubmitState } from "./actions";

const initial: SubmitState = {};

export function FeesActions({ isSubmitted }: { isSubmitted: boolean }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(submitApplication, initial);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Close the confirm dialog once submission lands (render-time adjustment).
  const [handledOk, setHandledOk] = useState(state.ok);
  if (state.ok !== handledOk) {
    setHandledOk(state.ok);
    if (state.ok) setConfirmOpen(false);
  }

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  // Show the success confirmation briefly, then go to the dashboard.
  useEffect(() => {
    if (!state.ok) return;
    const t = setTimeout(() => {
      router.replace("/portal");
      router.refresh();
    }, 1800);
    return () => clearTimeout(t);
  }, [state.ok, router]);

  return (
    <div className="flex items-center justify-between gap-2 border-t pt-4">
      <Button asChild variant="outline">
        <Link href="/portal/documents">
          <ArrowLeft /> Back
        </Link>
      </Button>

      {isSubmitted ? (
        <span className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" /> Submitted
        </span>
      ) : (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button>Submit application</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit your application?</AlertDialogTitle>
              <AlertDialogDescription>
                This finalises your application and sends it for review. You won&apos;t be able
                to edit your details afterwards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <form action={formAction}>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  Yes, submit
                </Button>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={!!state.ok}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="size-6 text-success" />
            </div>
            <DialogTitle>Application submitted</DialogTitle>
            <DialogDescription>
              Your application has been submitted successfully. Taking you to your dashboard…
            </DialogDescription>
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
