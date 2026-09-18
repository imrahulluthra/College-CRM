import { LifeBuoy } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { ComingSoon } from "@/features/portal/coming-soon";
import { PageHeader } from "@/features/portal/page-header";

export default async function TicketsPage() {
  await requireStudent();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Raise a Ticket" description="Get help from the college support team." />
      <ComingSoon
        icon={LifeBuoy}
        title="Support tickets aren't available yet"
        description="You'll be able to raise tickets for fees, documents, academics and technical issues, and track their status here."
      />
    </div>
  );
}
