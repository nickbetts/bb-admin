import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text) shadow-sm transition-colors outline-none placeholder:text-(--text-3) disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg)",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
