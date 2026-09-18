"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { updatePayment, type ActionState } from "@/app/(app)/admissions/actions";
import type { PaymentRow } from "@/features/admissions/data";

const initial: ActionState = {};

export function RecordPayment({ row }: { row: PaymentRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(updatePayment, initial);

  // Render-time state adjustment (not an effect) -- close on success.
  const [handledOk, setHandledOk] = useState(state.ok);
  if (state.ok !== handledOk) {
    setHandledOk(state.ok);
    if (state.ok) setOpen(false);
  }

  useEffect(() => {
    if (state.ok) toast.success("Payment updated");
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Record
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="paymentId" value={row.paymentId} />
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{row.applicantName}</span>
              <span className="font-medium">{row.label}</span>
            </div>
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>Total</span>
              <span className="tabular-nums">₹{row.total.toLocaleString("en-IN")}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amountPaid">Amount paid (₹)</Label>
            <Input
              id="amountPaid"
              name="amountPaid"
              type="number"
              min={0}
              step="0.01"
              defaultValue={row.paid}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={row.status}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
