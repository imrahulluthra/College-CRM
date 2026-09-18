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
import { cn } from "@/lib/utils";
import { createSegment, type ActionState } from "@/app/(app)/messaging/actions";
import { ALL_LEAD_STATUSES, leadStatusLabel } from "@/features/leads/status";

const initial: ActionState = {};
const ANY = "any";

export function SegmentForm({
  programs,
  counselors,
}: {
  programs: { id: string; name: string }[];
  counselors: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [state, formAction, isPending] = useActionState(createSegment, initial);

  const [handledOk, setHandledOk] = useState(state.ok);
  if (state.ok !== handledOk) {
    setHandledOk(state.ok);
    if (state.ok) {
      setOpen(false);
      setStatuses([]);
    }
  }

  const toggle = (s: string) =>
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New segment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New segment</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Interested — MBA" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Optional" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Lead statuses</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LEAD_STATUSES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggle(s)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    statuses.includes(s)
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {leadStatusLabel(s)}
                </button>
              ))}
            </div>
            {statuses.map((s) => (
              <input key={s} type="hidden" name="statuses" value={s} />
            ))}
            <p className="text-xs text-muted-foreground">
              Leave empty to include every status.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="programId">Program</Label>
              <Select name="programId" defaultValue={ANY}>
                <SelectTrigger id="programId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any program</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="counselorId">Counselor</Label>
              <Select name="counselorId" defaultValue={ANY}>
                <SelectTrigger id="counselorId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any counselor</SelectItem>
                  {counselors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" placeholder="Optional" />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending && <Loader2 className="animate-spin" />}
            Save segment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
