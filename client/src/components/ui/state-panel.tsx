import { Loader2, AlertCircle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type StateVariant = "loading" | "empty" | "error";

interface StatePanelProps {
  variant?: StateVariant;
  title?: string;
  description?: string;
  className?: string;
}

const defaults: Record<StateVariant, { title: string; description: string }> = {
  loading: {
    title: "Loading",
    description: "Please wait while content is loading.",
  },
  empty: {
    title: "No items yet",
    description: "There is nothing to show right now.",
  },
  error: {
    title: "Something went wrong",
    description: "Please try again in a moment.",
  },
};

export function StatePanel({
  variant = "loading",
  title,
  description,
  className,
}: StatePanelProps) {
  const meta = defaults[variant];
  const resolvedTitle = title ?? meta.title;
  const resolvedDescription = description ?? meta.description;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 text-center text-slate-700 dark:border-white/10 dark:bg-card dark:text-slate-200",
        className
      )}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <div className="mx-auto mb-2.5 flex size-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
        {variant === "loading" && <Loader2 className="size-5 animate-spin text-slate-700 dark:text-slate-200" />}
        {variant === "empty" && <Inbox className="size-5 text-slate-700 dark:text-slate-200" />}
        {variant === "error" && <AlertCircle className="size-5 text-red-600 dark:text-red-400" />}
      </div>
      <p className="text-sm font-semibold">{resolvedTitle}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{resolvedDescription}</p>
    </div>
  );
}

