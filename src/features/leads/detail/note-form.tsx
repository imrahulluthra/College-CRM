"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addLeadNote, type ActionState } from "@/app/(app)/leads/actions";

const initialState: ActionState = {};

export function NoteForm({ leadId }: { leadId: string }) {
  const [state, formAction, isPending] = useActionState(addLeadNote, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <Textarea name="note" placeholder="Add a note about this lead…" required rows={3} />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Add note
        </Button>
      </div>
    </form>
  );
}
