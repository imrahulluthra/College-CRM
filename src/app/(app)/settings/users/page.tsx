import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import { CreateUserForm } from "./create-user-form";
import { UserList, type StaffRow } from "./user-list";

export default async function UsersPage() {
  await requireUser(["super_admin"]);
  const supabase = await createClient();

  const [{ data: profiles }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, is_active")
      .order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  const rolesByUser = new Map<string, UserRole[]>();
  for (const row of roleRows ?? []) {
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(row.role);
    rolesByUser.set(row.user_id, list);
  }

  const users: StaffRow[] = (profiles ?? []).map((p) => ({
    ...p,
    roles: rolesByUser.get(p.id) ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          Create logins for counselors, admissions managers, and document
          reviewers. There is no public sign-up -- every account is created here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a login</CardTitle>
          <CardDescription>
            A temporary password is generated and shown once. Share it securely
            and have the person change it after first sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All staff</CardTitle>
        </CardHeader>
        <CardContent>
          <UserList users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
