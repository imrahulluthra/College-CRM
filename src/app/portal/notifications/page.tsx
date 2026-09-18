import { Bell } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { ComingSoon } from "@/features/portal/coming-soon";
import { PageHeader } from "@/features/portal/page-header";

export default async function NotificationsPage() {
  await requireStudent();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifications" description="Updates about your application and college." />
      <ComingSoon
        icon={Bell}
        title="No notifications yet"
        description="Updates on fees, documents, application status, assignments and college announcements will show up here."
      />
    </div>
  );
}
