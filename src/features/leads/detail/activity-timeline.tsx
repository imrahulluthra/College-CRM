import type { ComponentType } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  FileText,
  MessageSquare,
  Phone,
  Plus,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";

import type { getLeadActivities } from "./data";
import type { getProfilesMap } from "@/features/leads/lookups";
import type { LeadActivityType } from "@/types/database";

const ICONS: Record<LeadActivityType, ComponentType<{ className?: string }>> = {
  created: Plus,
  duplicate_submission: Copy,
  status_changed: FileText,
  assigned: UserCheck,
  reassigned: UserCheck,
  note: MessageSquare,
  call: Phone,
  email: Send,
  whatsapp: MessageSquare,
  task_created: CalendarClock,
  task_completed: CheckCircle2,
  task_cancelled: XCircle,
  application_link_sent: Send,
};

export function ActivityTimeline({
  activities,
  profiles,
}: {
  activities: Awaited<ReturnType<typeof getLeadActivities>>;
  profiles: Awaited<ReturnType<typeof getProfilesMap>>;
}) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {activities.map((activity) => {
        const Icon = ICONS[activity.activity_type] ?? FileText;
        const actorName = activity.actor_id
          ? (profiles.get(activity.actor_id)?.full_name ?? "Unknown")
          : "System";

        return (
          <li key={activity.id} className="flex gap-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm">{activity.description}</p>
              <p className="text-xs text-muted-foreground">
                {actorName} · {new Date(activity.created_at).toLocaleString()}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
