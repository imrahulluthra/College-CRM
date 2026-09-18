import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

// Honest placeholder for modules whose data/functionality isn't wired yet.
// No fake buttons or invented records — it states plainly that the section is
// on the way and will populate from the college's records once connected.
export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <Icon className="size-6" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          Coming soon
        </span>
      </CardContent>
    </Card>
  );
}
