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
import { createNurtureRule, type ActionState } from "@/app/(app)/messaging/actions";
import { LEAD_STATUS_ORDER, leadStatusLabel } from "@/features/leads/status";

const initial: ActionState = {};

export function NurtureRuleForm({ templates }: { templates: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState("lead_created");
  const [state, formAction, isPending] = useActionState(createNurtureRule, initial);

  const [handledOk, setHandledOk] = useState(state.ok);
  if (state.ok !== handledOk) {
    setHandledOk(state.ok);
    if (state.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={templates.length === 0}>
          <Plus /> New rule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New nurture rule</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Welcome new enquiries" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trigger">When</Label>
            <Select name="trigger" value={trigger} onValueChange={setTrigger}>
              <SelectTrigger id="trigger" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_created">A lead is created</SelectItem>
                <SelectItem value="lead_status_changed">A lead reaches a status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {trigger === "lead_status_changed" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="toStatus">Status</Label>
              <Select name="toStatus">
                <SelectTrigger id="toStatus" className="w-full">
                  <SelectValue placeholder="Choose a status" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {leadStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="templateId">Send template</Label>
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

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending && <Loader2 className="animate-spin" />}
            Save rule
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
