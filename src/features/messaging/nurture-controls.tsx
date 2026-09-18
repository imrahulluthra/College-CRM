"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  runNurtureNow,
  toggleNurtureRule,
  type ActionState,
} from "@/app/(app)/messaging/actions";

const initial: ActionState = {};

export function RunNurtureButton() {
  const [state, formAction, isPending] = useActionState(runNurtureNow, initial);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) toast.success(state.message ?? "Automations run");
  }, [state.error, state.ok, state.message]);

  return (
    <form action={formAction}>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <Play className="size-4" />}
        Run now
      </Button>
    </form>
  );
}

export function RuleToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, formAction, isPending] = useActionState(toggleNurtureRule, initial);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
      <Button
        type="submit"
        size="sm"
        variant={isActive ? "ghost" : "outline"}
        disabled={isPending}
        className={isActive ? "text-muted-foreground" : ""}
      >
        {isPending && <Loader2 className="animate-spin" />}
        {isActive ? "Pause" : "Activate"}
      </Button>
    </form>
  );
}
