"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { sendCampaignNow, type ActionState } from "@/app/(app)/messaging/actions";

const initial: ActionState = {};

export function SendCampaignButton({ campaignId, name }: { campaignId: string; name: string }) {
  const [state, formAction, isPending] = useActionState(sendCampaignNow, initial);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) toast.success(state.message ?? "Campaign sent");
  }, [state.error, state.ok, state.message]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
          Send
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send “{name}” now?</AlertDialogTitle>
          <AlertDialogDescription>
            This queues one WhatsApp message per lead in the audience, skipping anyone who has
            opted out. It can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="campaignId" value={campaignId} />
            <AlertDialogAction type="submit">Send campaign</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
