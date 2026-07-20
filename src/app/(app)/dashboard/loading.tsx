import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Card>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-6 w-2/3" />
        <Skeleton className="mt-4 h-9 w-40" />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card className="flex items-center justify-center">
          <Skeleton className="h-32 w-32 rounded-full" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-48" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </Card>
      </div>

      <Card>
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </Card>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        Refreshing Growth Opportunities…
      </p>
    </div>
  );
}
