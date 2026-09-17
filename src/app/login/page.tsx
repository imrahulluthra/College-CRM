import { GraduationCap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const redirectTo =
    typeof searchParams.redirectTo === "string" ? searchParams.redirectTo : undefined;

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6">
      {/* Soft brand wash behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent)",
        }}
      />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">College CRM</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to the admissions workspace.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <LoginForm redirectTo={redirectTo} />
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Accounts are created by your Super Admin. There is no self-signup.
        </p>
      </div>
    </div>
  );
}
