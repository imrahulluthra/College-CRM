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
import { createCampaign, type ActionState } from "@/app/(app)/messaging/actions";

const initial: ActionState = {};

export function CampaignForm({
  templates,
  segments,
}: {
  templates: { id: string; name: string }[];
  segments: { id: string; name: string; count: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createCampaign, initial);

  const [handledOk, setHandledOk] = useState(state.ok);
  if (state.ok !== handledOk) {
    setHandledOk(state.ok);
    if (state.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={templates.length === 0}>
          <Plus /> New campaign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="October MBA follow-up" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="templateId">Template</Label>
            <Select name="templateId" required>
              <SelectTrigger id="templateId" className="w-full">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="segmentId">Audience</Label>
            <Select name="segmentId" defaultValue="any">
              <SelectTrigger id="segmentId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All leads</SelectItem>
                {segments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending && <Loader2 className="animate-spin" />}
            Create draft
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
