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
import { updateLeadStatus, type ActionState } from "@/app/(app)/leads/actions";
import { ALL_LEAD_STATUSES, leadStatusLabel } from "@/features/leads/status";
import type { LeadStatus } from "@/types/database";

const initialState: ActionState = {};

export function StatusControl({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [state, formAction, isPending] = useActionState(updateLeadStatus, initialState);
  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
    }
    lastError.current = state.error;
  }, [state.error]);

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) => {
        const formData = new FormData();
        formData.set("leadId", leadId);
        formData.set("status", value);
        formAction(formData);
      }}
    >
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_LEAD_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {leadStatusLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
