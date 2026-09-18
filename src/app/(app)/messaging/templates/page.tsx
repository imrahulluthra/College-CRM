import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTemplates } from "@/features/messaging/data";
import { TemplateForm } from "@/features/messaging/template-form";

export default async function TemplatesPage() {
  await requireStaff(["super_admin", "admissions_manager"]);
  const supabase = await createClient();
  const templates = await getTemplates(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable WhatsApp messages for campaigns and automation.
          </p>
        </div>
        <TemplateForm />
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No templates yet. Create your first one to use in campaigns and nurture rules.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium">{t.name}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary">{t.category}</Badge>
                    <Badge variant={t.status === "approved" ? "success" : "secondary"}>
                      {t.status}
                    </Badge>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
