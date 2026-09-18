import { Settings } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { ComingSoon } from "@/features/portal/coming-soon";
import { PageHeader } from "@/features/portal/page-header";

export default async function SettingsPage() {
  await requireStudent();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Manage your account preferences." />
      <ComingSoon
        icon={Settings}
        title="Settings aren't available yet"
        description="Editing permitted profile fields, changing your password and notification preferences will live here."
      />
    </div>
  );
}
