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
import { updateApplicationStatus, type ActionState } from "@/app/(app)/admissions/actions";
import { APPLICATION_STATUSES, applicationStatusLabel } from "@/features/portal/application-status";
import type { ApplicationStatus } from "@/types/database";

const initial: ActionState = {};

export function ApplicationStatusControl({
  applicationId,
  leadId,
  status,
}: {
  applicationId: string;
  leadId: string;
  status: ApplicationStatus;
}) {
  const [state, formAction, isPending] = useActionState(updateApplicationStatus, initial);
  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) toast.error(state.error);
    lastError.current = state.error;
  }, [state.error]);

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) => {
        const fd = new FormData();
        fd.set("applicationId", applicationId);
        fd.set("leadId", leadId);
        fd.set("status", value);
        formAction(fd);
      }}
    >
      <SelectTrigger size="sm" className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {APPLICATION_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {applicationStatusLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
