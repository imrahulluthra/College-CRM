import { CalendarCheck } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { ComingSoon } from "@/features/portal/coming-soon";
import { PageHeader } from "@/features/portal/page-header";

export default async function AttendancePage() {
  await requireStudent();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Attendance" description="Your class attendance across subjects." />
      <ComingSoon
        icon={CalendarCheck}
        title="Attendance isn't available yet"
        description="Once your course begins, subject-wise attendance recorded by the college will appear here."
      />
    </div>
  );
}
