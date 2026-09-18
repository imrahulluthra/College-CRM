"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendReply, type ActionState } from "@/app/(app)/messaging/actions";

const initial: ActionState = {};

export function ReplyBox({ leadId, suppressed }: { leadId: string; suppressed: boolean }) {
  const [state, formAction, isPending] = useActionState(sendReply, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
    else if (state.error) toast.error(state.error);
  }, [state]);

  if (suppressed) {
    return (
      <p className="rounded-md border bg-muted/40 px-3 py-2.5 text-center text-sm text-muted-foreground">
        This lead has opted out — messaging is disabled.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <Textarea
        name="body"
        required
        rows={1}
        placeholder="Type a message…"
        className="max-h-40 min-h-10 flex-1 resize-none"
      />
      <Button type="submit" size="icon" disabled={isPending} aria-label="Send">
        {isPending ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
      </Button>
    </form>
  );
}
