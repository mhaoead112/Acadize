import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 6, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900/40">
      <div className="grid border-b border-slate-100 dark:border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, idx) => (
          <Skeleton key={idx} className="h-3 w-3/4" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-white/10">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div key={colIdx} className="pr-4 py-1">
                <Skeleton className="h-3 w-5/6" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

