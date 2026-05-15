"use client";

import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

const RadixDialogRoot = Dialog.Root;
const RadixDialogTrigger = Dialog.Trigger;
const RadixDialogClose = Dialog.Close;

const RadixDialogPortal = (props: Dialog.DialogPortalProps) => <Dialog.Portal {...props} />;
RadixDialogPortal.displayName = "RadixDialogPortal";

const RadixDialogOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[var(--z-overlay)] bg-slate-950/35 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
RadixDialogOverlay.displayName = Dialog.Overlay.displayName;

const RadixDialogContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content>
>(({ className, children, ...props }, ref) => (
  <RadixDialogPortal>
    <RadixDialogOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        "fixed top-1/2 left-1/2 z-[var(--z-modal)] w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2",
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    >
      {children}
      <Dialog.Close
        className={cn(
          "absolute top-3 right-3 rounded-md p-1 text-[var(--text-3)]",
          "hover:bg-slate-100 hover:text-[var(--text)]",
          "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
        )}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Dialog.Close>
    </Dialog.Content>
  </RadixDialogPortal>
));
RadixDialogContent.displayName = Dialog.Content.displayName;

const RadixDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 flex flex-col gap-1.5", className)} {...props} />
);
RadixDialogHeader.displayName = "RadixDialogHeader";

const RadixDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex items-center justify-end gap-2", className)} {...props} />
);
RadixDialogFooter.displayName = "RadixDialogFooter";

const RadixDialogTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn(
      "text-lg leading-none font-semibold tracking-tight text-[var(--text)]",
      className,
    )}
    {...props}
  />
));
RadixDialogTitle.displayName = Dialog.Title.displayName;

const RadixDialogDescription = React.forwardRef<
  React.ElementRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn("text-sm text-[var(--text-2)]", className)}
    {...props}
  />
));
RadixDialogDescription.displayName = Dialog.Description.displayName;

export {
  RadixDialogClose,
  RadixDialogContent,
  RadixDialogDescription,
  RadixDialogFooter,
  RadixDialogHeader,
  RadixDialogOverlay,
  RadixDialogPortal,
  RadixDialogRoot,
  RadixDialogTitle,
  RadixDialogTrigger,
};
