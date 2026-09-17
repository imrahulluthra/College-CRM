"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLeadTask, type ActionState } from "@/app/(app)/leads/actions";
import type { TaskType } from "@/types/database";

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "follow_up", label: "Follow-up" },
  { value: "meeting", label: "Meeting" },
  { value: "document_reminder", label: "Document reminder" },
  { value: "application_reminder", label: "Application reminder" },
  { value: "other", label: "Other" },
];

const initialState: ActionState = {};

export function CreateTaskForm({
  leadId,
  assignees,
  defaultAssigneeId,
}: {
  leadId: string;
  assignees: { id: string; full_name: string }[];
  defaultAssigneeId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createLeadTask, initialState);

  // Render-time state adjustment (not an effect) -- see the same note in
  // settings/users/create-user-form.tsx.
  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full sm:w-auto">
          <Plus /> New task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="leadId" value={leadId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="Follow up tomorrow at 11 AM" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taskType">Type</Label>
              <Select name="taskType" defaultValue="follow_up">
                <SelectTrigger id="taskType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueAt">Due</Label>
              <Input id="dueAt" name="dueAt" type="datetime-local" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assignedTo">Assign to</Label>
            <Select name="assignedTo" defaultValue={defaultAssigneeId}>
              <SelectTrigger id="assignedTo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending && <Loader2 className="animate-spin" />}
            Create task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
