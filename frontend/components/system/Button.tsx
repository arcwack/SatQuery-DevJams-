"use client";

import { forwardRef, type ComponentProps } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<typeof motion.button> & {
  variant?: "primary" | "ghost";
};

/**
 * Sharp, rectangular by default (radius-hard) — an instrument control,
 * not a SaaS pill. `data-cursor="action"` wires it into the reticle
 * cursor's solid-fill affordance; the visible hover/focus states below
 * work identically without it.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        data-cursor="action"
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "rounded-hard inline-flex items-center justify-center gap-2 px-4 py-2.5",
          "font-sans text-small font-medium tracking-[0.01em]",
          "transition-colors duration-150",
          "disabled:pointer-events-none disabled:opacity-40",
          variant === "primary" &&
            "bg-signal text-void hover:bg-signal-bright border border-signal",
          variant === "ghost" &&
            "bg-transparent text-ink-dim border border-line hover:border-line-bright hover:text-ink",
          className,
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
