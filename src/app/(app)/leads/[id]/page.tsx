import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser, isAdminOrManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLead, getLeadActivities, getLeadTasks } from "@/features/leads/detail/data";
import { getCounselors, getProfilesMap } from "@/features/leads/lookups";
import { LeadHeader } from "@/features/leads/detail/lead-header";
import { OverviewTab } from "@/features/leads/detail/overview-tab";
import { ActivityTimeline } from "@/features/leads/detail/activity-timeline";
import { NoteForm } from "@/features/leads/detail/note-form";
import { CreateTaskForm } from "@/features/leads/detail/create-task-form";
import { TasksList } from "@/features/leads/detail/tasks-list";

export default async function LeadDetailPage(props: PageProps<"/leads/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();
  const supabase = await createClient();

  const lead = await getLead(supabase, id);
  if (!lead) notFound();

  // react-hooks/purity is a Client Component rule (guards React Compiler
  // memoization assumptions); it doesn't apply here -- this Server Component
  // re-executes fresh on every request, so there's no stale-memo risk.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const [activities, tasks, profiles, counselors, program, admissionCycle, source] =
    await Promise.all([
      getLeadActivities(supabase, id),
      getLeadTasks(supabase, id),
      getProfilesMap(supabase),
      getCounselors(supabase),
      lead.program_id
        ? supabase.from("programs").select("name").eq("id", lead.program_id).maybeSingle()
        : Promise.resolve({ data: null }),
      lead.admission_cycle_id
        ? supabase
            .from("admission_cycles")
            .select("name")
            .eq("id", lead.admission_cycle_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      lead.source_id
        ? supabase.from("lead_sources").select("name").eq("id", lead.source_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const notes = activities.filter((a) => a.activity_type === "note");

  return (
    <div className="flex flex-col gap-6">
      <LeadHeader
        lead={lead}
        programName={program.data?.name ?? null}
        sourceName={source.data?.name ?? null}
        counselors={counselors}
        canAssign={isAdminOrManager(user)}
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="application" disabled>
            Application
          </TabsTrigger>
          <TabsTrigger value="documents" disabled>
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            lead={lead}
            programName={program.data?.name ?? null}
            admissionCycleName={admissionCycle.data?.name ?? null}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent>
              <ActivityTimeline activities={activities} profiles={profiles} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="flex flex-col gap-6">
              <NoteForm leadId={lead.id} />
              <div className="flex flex-col gap-4">
                {notes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                )}
                {notes.map((note) => (
                  <div key={note.id} className="rounded-md border p-3">
                    <p className="text-sm">{note.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(note.actor_id && profiles.get(note.actor_id)?.full_name) ?? "System"} ·{" "}
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex justify-end">
                <CreateTaskForm
                  leadId={lead.id}
                  assignees={counselors}
                  defaultAssigneeId={lead.assigned_counselor_id ?? user.id}
                />
              </div>
              <TasksList tasks={tasks} leadId={lead.id} profiles={profiles} now={now} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
