import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("relative overflow-hidden rounded-md bg-muted", className)}
      {...props}
    >
      <div
        className="skeleton-sweep absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent"
        style={{ animation: "skeleton-shimmer 1.6s ease-in-out infinite" }}
      />
    </div>
  );
}

export { Skeleton };
