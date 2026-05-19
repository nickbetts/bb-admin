import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-(--accent-bg) text-(--accent-text)",
        secondary: "border-transparent bg-(--border-subtle) text-(--text-2)",
        success: "border-(--success-border) bg-(--success-bg) text-(--success-text)",
        info: "border-(--info-border) bg-(--info-bg) text-(--info-text)",
        destructive: "border-(--danger-border) bg-(--danger-bg) text-(--danger-text)",
        warning: "border-(--warning-border) bg-(--warning-bg) text-(--warning-text)",
        outline: "border-(--border) text-(--text-2)",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
