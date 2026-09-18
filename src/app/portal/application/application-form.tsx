"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";
import { saveApplication, type AppFormState } from "./actions";

type Profile = Database["public"]["Tables"]["student_profiles"]["Row"];

const initial: AppFormState = {};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  ...rest
}: {
  label: string;
  name: keyof Profile;
  defaultValue: string | number | null;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "name">) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} {...rest} />
    </div>
  );
}

export function ApplicationForm({ profile }: { profile: Profile }) {
  const [state, formAction, isPending] = useActionState(saveApplication, initial);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={profile.date_of_birth} />
        <Field label="Gender" name="gender" defaultValue={profile.gender} />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" defaultValue={profile.address ?? ""} rows={2} />
        </div>
        <Field label="City" name="city" defaultValue={profile.city} />
        <Field label="State" name="state" defaultValue={profile.state} />
        <Field label="Guardian name" name="guardian_name" defaultValue={profile.guardian_name} />
        <Field label="Guardian phone" name="guardian_phone" defaultValue={profile.guardian_phone} />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Field label="10th %" name="tenth_percentage" type="number" step="0.01" min="0" max="100" defaultValue={profile.tenth_percentage} />
        <Field label="12th %" name="twelfth_percentage" type="number" step="0.01" min="0" max="100" defaultValue={profile.twelfth_percentage} />
        <Field label="Graduation %" name="graduation_percentage" type="number" step="0.01" min="0" max="100" defaultValue={profile.graduation_percentage} />
        <Field label="Entrance exam" name="entrance_exam" defaultValue={profile.entrance_exam} />
        <Field label="Entrance score" name="entrance_score" defaultValue={profile.entrance_score} />
      </section>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Your details are saved when you continue. Next: upload documents.
        </p>
        <Button type="submit" disabled={isPending} className="shrink-0">
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Next
          {!isPending && <ArrowRight />}
        </Button>
      </div>
    </form>
  );
}
