import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStatsSkeletonProps {
  count?: number;
}

export function DashboardStatsSkeleton({ count = 4 }: DashboardStatsSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900/40 p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-2/3" />
        </div>
      ))}
    </div>
  );
}

