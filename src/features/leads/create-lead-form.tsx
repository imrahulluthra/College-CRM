"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { createLead, type ActionState } from "@/app/(app)/leads/actions";
import type { FilterOption } from "./filters-bar";

const initialState: ActionState = {};

export function CreateLeadForm({
  programs,
  sources,
}: {
  programs: FilterOption[];
  sources: FilterOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createLead, initialState);

  // Render-time state adjustment (not an effect) so we only react once per
  // actual action result -- see the same note in settings/users/create-user-form.tsx.
  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) setOpen(false);
  }

  useEffect(() => {
    if (state.success) toast.success("Lead added");
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
          <DialogDescription>
            For walk-ins, phone enquiries, or anything not coming through the website form.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City (optional)</Label>
            <Input id="city" name="city" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="programId">Program</Label>
            <Select name="programId">
              <SelectTrigger id="programId" className="w-full">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="sourceId">Source</Label>
            <Select name="sourceId" defaultValue={sources.find((s) => s.name === "Walk-in")?.id}>
              <SelectTrigger id="sourceId" className="w-full">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.error && (
            <p role="alert" className="sm:col-span-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Add lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
