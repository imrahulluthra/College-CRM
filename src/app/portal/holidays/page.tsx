import { CalendarDays } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { ComingSoon } from "@/features/portal/coming-soon";
import { PageHeader } from "@/features/portal/page-header";

export default async function HolidaysPage() {
  await requireStudent();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Holidays" description="College holiday calendar for the academic year." />
      <ComingSoon
        icon={CalendarDays}
        title="Holiday calendar isn't available yet"
        description="The college's holiday list for your academic year will be published here."
      />
    </div>
  );
}
