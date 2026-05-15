"use client";

import { cn } from "@/lib/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import * as React from "react";

const RadixDropdownMenuRoot = DropdownMenu.Root;
const RadixDropdownMenuTrigger = DropdownMenu.Trigger;
const RadixDropdownMenuGroup = DropdownMenu.Group;
const RadixDropdownMenuPortal = DropdownMenu.Portal;
const RadixDropdownMenuSub = DropdownMenu.Sub;
const RadixDropdownMenuRadioGroup = DropdownMenu.RadioGroup;

const RadixDropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenu.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default items-center rounded-md px-2 py-1.5 text-sm text-(--text) outline-none select-none",
      "focus:bg-indigo-50 data-[state=open]:bg-indigo-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenu.SubTrigger>
));
RadixDropdownMenuSubTrigger.displayName = DropdownMenu.SubTrigger.displayName;

const RadixDropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenu.SubContent
    ref={ref}
    className={cn(
      "z-(--z-dropdown) min-w-44 rounded-xl border border-(--border)",
      "bg-(--surface) p-1 text-(--text) shadow-lg",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
      className,
    )}
    {...props}
  />
));
RadixDropdownMenuSubContent.displayName = DropdownMenu.SubContent.displayName;

const RadixDropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-(--z-dropdown) min-w-48 rounded-xl border border-(--border)",
        "bg-(--surface) p-1 text-(--text) shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    />
  </DropdownMenu.Portal>
));
RadixDropdownMenuContent.displayName = DropdownMenu.Content.displayName;

const RadixDropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenu.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default items-center rounded-md px-2 py-1.5 text-sm select-none",
      "text-(--text) transition-colors outline-none",
      "focus:bg-indigo-50 data-disabled:pointer-events-none data-disabled:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
RadixDropdownMenuItem.displayName = DropdownMenu.Item.displayName;

const RadixDropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenu.CheckboxItem
    ref={ref}
    checked={checked}
    className={cn(
      "relative flex cursor-default items-center rounded-md py-1.5 pr-2 pl-8 text-sm select-none",
      "text-(--text) transition-colors outline-none",
      "focus:bg-indigo-50 data-disabled:pointer-events-none data-disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 inline-flex h-4 w-4 items-center justify-center">
      <DropdownMenu.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenu.ItemIndicator>
    </span>
    {children}
  </DropdownMenu.CheckboxItem>
));
RadixDropdownMenuCheckboxItem.displayName = DropdownMenu.CheckboxItem.displayName;

const RadixDropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenu.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold text-(--text-2)", inset && "pl-8", className)}
    {...props}
  />
));
RadixDropdownMenuLabel.displayName = DropdownMenu.Label.displayName;

const RadixDropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenu.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-(--border)", className)}
    {...props}
  />
));
RadixDropdownMenuSeparator.displayName = DropdownMenu.Separator.displayName;

export {
  RadixDropdownMenuCheckboxItem,
  RadixDropdownMenuContent,
  RadixDropdownMenuGroup,
  RadixDropdownMenuItem,
  RadixDropdownMenuLabel,
  RadixDropdownMenuPortal,
  RadixDropdownMenuRadioGroup,
  RadixDropdownMenuRoot,
  RadixDropdownMenuSeparator,
  RadixDropdownMenuSub,
  RadixDropdownMenuSubContent,
  RadixDropdownMenuSubTrigger,
  RadixDropdownMenuTrigger,
};
