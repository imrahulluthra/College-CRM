"use client";

import { useActionState, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import { createApiKey, type CreateKeyState } from "./actions";

const initialState: CreateKeyState = {};

export function CreateKeyForm() {
  const [state, formAction, isPending] = useActionState(createApiKey, initialState);
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <form
        key={formKey}
        action={formAction}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="name">Key name</Label>
          <Input id="name" name="name" placeholder="College website" required />
        </div>
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending && <Loader2 className="animate-spin" />}
          Generate key
        </Button>
      </form>
      {state.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}

      <Dialog open={!!state.success} onOpenChange={() => setFormKey((k) => k + 1)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Key created: {state.success?.name}</DialogTitle>
            <DialogDescription>
              This is the only time the full key is shown. Paste it into the embed
              snippet on the college website (see docs/WEBSITE-INTEGRATION.md).
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted p-3">
            <code className="text-sm break-all">{state.success?.fullKey}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => {
                if (state.success) {
                  navigator.clipboard.writeText(state.success.fullKey);
                  toast.success("Key copied");
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
