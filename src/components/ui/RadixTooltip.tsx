"use client";

import { cn } from "@/lib/utils";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as React from "react";

const RadixTooltipProvider = Tooltip.Provider;
const RadixTooltipRoot = Tooltip.Root;
const RadixTooltipTrigger = Tooltip.Trigger;

const RadixTooltipContent = React.forwardRef<
  React.ElementRef<typeof Tooltip.Content>,
  React.ComponentPropsWithoutRef<typeof Tooltip.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <Tooltip.Portal>
    <Tooltip.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[var(--z-tooltip)] rounded-md border border-slate-700/40 bg-slate-900 px-2.5 py-1.5",
        "text-xs font-medium text-slate-100 shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    />
  </Tooltip.Portal>
));
RadixTooltipContent.displayName = Tooltip.Content.displayName;

export { RadixTooltipContent, RadixTooltipProvider, RadixTooltipRoot, RadixTooltipTrigger };
