import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateKeyForm } from "./create-key-form";
import { KeyList } from "./key-list";

export default async function ApiKeysPage() {
  await requireUser(["super_admin"]);
  const supabase = await createClient();

  const { data: apiKeys } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, is_active, last_used_at, created_at")
    .order("created_at", { ascending: false });

  const endpoint = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-crm-domain"}/api/leads`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website Integration</h1>
        <p className="text-muted-foreground text-sm">
          Generate a key so the college website can post enquiry-form
          submissions straight into the CRM as leads. Full setup instructions
          and copy-paste embed code are in{" "}
          <code className="text-xs">docs/WEBSITE-INTEGRATION.md</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate a key</CardTitle>
          <CardDescription>One key per website/integration is recommended, so a leaked or misbehaving key can be revoked without breaking others.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateKeyForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-sm">POST {endpoint}</code>
          <p className="mt-2 text-sm text-muted-foreground">
            See <code className="text-xs">docs/WEBSITE-INTEGRATION.md</code> in
            the repository for the embeddable form snippet and a plain-HTML
            fallback that works without JavaScript.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyList apiKeys={apiKeys ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
