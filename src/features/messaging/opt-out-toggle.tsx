"use client";

import { useActionState, useEffect } from "react";
import { Loader2, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleSuppression, type ActionState } from "@/app/(app)/messaging/actions";

const initial: ActionState = {};

export function OptOutToggle({
  leadId,
  suppressed,
  variant = "button",
}: {
  leadId: string;
  suppressed: boolean;
  variant?: "button" | "compact";
}) {
  const [state, formAction, isPending] = useActionState(toggleSuppression, initial);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) toast.success(suppressed ? "Opted back in" : "Opted out");
  }, [state.error, state.ok, suppressed]);

  return (
    <form action={formAction}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="action" value={suppressed ? "remove" : "add"} />
      <Button
        type="submit"
        size={variant === "compact" ? "sm" : "sm"}
        variant={suppressed ? "outline" : "ghost"}
        disabled={isPending}
        className={suppressed ? "" : "text-muted-foreground"}
      >
        {isPending ? (
          <Loader2 className="animate-spin" />
        ) : suppressed ? (
          <ShieldCheck className="size-4" />
        ) : (
          <ShieldOff className="size-4" />
        )}
        {suppressed ? "Opt back in" : "Opt out"}
      </Button>
    </form>
  );
}
