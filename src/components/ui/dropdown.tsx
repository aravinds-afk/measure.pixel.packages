"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const Dropdown = DropdownMenu.Root;
export const DropdownTrigger = DropdownMenu.Trigger;

export function DropdownContent({ className, align = "end", ...props }: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg animate-mp-fade-in",
          className
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function DropdownItem({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Item>) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground outline-none transition-colors",
        "hover:bg-surface-2 focus:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className
      )}
      {...props}
    />
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Label>) {
  return <DropdownMenu.Label className={cn("px-2.5 py-1.5 text-xs font-medium text-muted", className)} {...props} />;
}

export function DropdownSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Separator>) {
  return <DropdownMenu.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
}
