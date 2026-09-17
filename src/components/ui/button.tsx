"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-12 items-center justify-center px-5 font-display text-[15px] font-semibold tracking-[0.16em] uppercase transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50",
  {
    variants: {
      variant: {
        gold: "bg-gold text-gold-fg hover:bg-gold/90",
        ghost: "border border-hair bg-transparent text-fg hover:border-gold hover:text-gold",
      },
      width: {
        auto: "",
        full: "w-full",
      },
    },
    defaultVariants: {
      variant: "gold",
      width: "auto",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, width, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, width }), className)} {...props} />;
}
