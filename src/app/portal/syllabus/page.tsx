import { BookOpen } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { ComingSoon } from "@/features/portal/coming-soon";
import { PageHeader } from "@/features/portal/page-header";

export default async function SyllabusPage() {
  await requireStudent();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Syllabus" description="Course structure, subjects and topics." />
      <ComingSoon
        icon={BookOpen}
        title="Syllabus isn't available yet"
        description="Once the college publishes the syllabus, you'll be able to view subjects, topics and faculty, and download it here."
      />
    </div>
  );
}
