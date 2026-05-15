"use client";

import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import * as React from "react";

const RadixPopoverRoot = Popover.Root;
const RadixPopoverTrigger = Popover.Trigger;
const RadixPopoverAnchor = Popover.Anchor;

const RadixPopoverContent = React.forwardRef<
  React.ElementRef<typeof Popover.Content>,
  React.ComponentPropsWithoutRef<typeof Popover.Content>
>(({ className, align = "center", sideOffset = 10, ...props }, ref) => (
  <Popover.Portal>
    <Popover.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-[var(--z-dropdown)] w-72 rounded-xl border border-[var(--border)]",
        "bg-[var(--surface)] p-4 text-[var(--text)] shadow-lg outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    />
  </Popover.Portal>
));
RadixPopoverContent.displayName = Popover.Content.displayName;

export { RadixPopoverAnchor, RadixPopoverContent, RadixPopoverRoot, RadixPopoverTrigger };
