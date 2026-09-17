import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full border border-hair bg-bg px-3.5 text-fg placeholder:text-muted/70 focus-visible:border-gold focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
