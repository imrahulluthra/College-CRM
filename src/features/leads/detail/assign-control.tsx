"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignCounselor, type ActionState } from "@/app/(app)/leads/actions";

const initialState: ActionState = {};

export function AssignControl({
  leadId,
  counselorId,
  counselors,
}: {
  leadId: string;
  counselorId: string | null;
  counselors: { id: string; full_name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(assignCounselor, initialState);
  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
    }
    lastError.current = state.error;
  }, [state.error]);

  return (
    <Select
      value={counselorId ?? ""}
      disabled={isPending}
      onValueChange={(value) => {
        const formData = new FormData();
        formData.set("leadId", leadId);
        formData.set("counselorId", value);
        formAction(formData);
      }}
    >
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        {counselors.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
