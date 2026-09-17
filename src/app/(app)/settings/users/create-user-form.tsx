"use client";

import { useActionState, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_LABELS } from "@/lib/permissions";
import { createStaffUser, type CreateUserState } from "./actions";

const CREATABLE_ROLES = [
  "super_admin",
  "admissions_manager",
  "counselor",
  "document_reviewer",
] as const;

const initialState: CreateUserState = {};

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createStaffUser, initialState);
  const [formKey, setFormKey] = useState(0);

  // Adjusting state during render (not in an effect) is the pattern React
  // recommends for "reset state when a value changes" -- see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  // `handledSuccess` tracks the last state.success reference we've already
  // reacted to, so this only fires once per actual server-action result.
  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) setFormKey((k) => k + 1);
  }

  return (
    <>
      <form key={formKey} action={formAction} className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Role</Label>
          <Select name="role" defaultValue="counselor" required>
            <SelectTrigger id="role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CREATABLE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
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
            Create login
          </Button>
        </div>
      </form>

      <Dialog open={!!state.success} onOpenChange={() => setFormKey((k) => k + 1)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login created</DialogTitle>
            <DialogDescription>
              Share these credentials with {state.success?.email} through a secure
              channel. This temporary password is shown only once -- it is not
              stored anywhere retrievable.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted p-3">
            <code className="text-sm">{state.success?.tempPassword}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                if (state.success) {
                  navigator.clipboard.writeText(state.success.tempPassword);
                  toast.success("Password copied");
                }
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
