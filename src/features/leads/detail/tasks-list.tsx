"use client";

import { useTransition } from "react";
import { CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelTask, completeTask } from "@/app/(app)/leads/actions";
import type { getLeadTasks } from "./data";
import type { getProfilesMap } from "@/features/leads/lookups";

export function TasksList({
  tasks,
  leadId,
  profiles,
  now,
}: {
  tasks: Awaited<ReturnType<typeof getLeadTasks>>;
  leadId: string;
  profiles: Awaited<ReturnType<typeof getProfilesMap>>;
  /** Request time from the server component, so the client component doesn't call Date.now() during render. */
  now: number;
}) {
  const [isPending, startTransition] = useTransition();

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => {
        const overdue = task.status === "pending" && new Date(task.due_at).getTime() < now;
        return (
          <li
            key={task.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {profiles.get(task.assigned_to)?.full_name ?? "Unassigned"} · Due{" "}
                {new Date(task.due_at).toLocaleString()}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {task.status === "pending" && overdue && <Badge variant="destructive">Overdue</Badge>}
              {task.status === "completed" && <Badge variant="success">Done</Badge>}
              {task.status === "cancelled" && <Badge variant="outline">Cancelled</Badge>}
              {task.status === "pending" && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isPending}
                    title="Mark complete"
                    aria-label="Mark task complete"
                    className="text-muted-foreground hover:bg-success/10 hover:text-success"
                    onClick={() =>
                      startTransition(async () => {
                        const res = await completeTask(task.id, leadId);
                        if (res.error) toast.error(res.error);
                      })
                    }
                  >
                    <CheckCircle2 className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isPending}
                    title="Cancel"
                    aria-label="Cancel task"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      startTransition(async () => {
                        const res = await cancelTask(task.id, leadId);
                        if (res.error) toast.error(res.error);
                      })
                    }
                  >
                    <X className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
