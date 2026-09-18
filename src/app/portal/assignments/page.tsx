import { ClipboardList } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { ComingSoon } from "@/features/portal/coming-soon";
import { PageHeader } from "@/features/portal/page-header";

export default async function AssignmentsPage() {
  await requireStudent();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Assignments" description="Assignments set by your faculty." />
      <ComingSoon
        icon={ClipboardList}
        title="Assignments aren't available yet"
        description="Assignments published by the college will appear here, where you'll be able to view instructions, upload your work, and track marks and feedback."
      />
    </div>
  );
}
