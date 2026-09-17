import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-2 block font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted",
        className,
      )}
      {...props}
    />
  );
}
