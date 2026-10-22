import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui Badge, themed.
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-ink text-paper",
        lime: "border-transparent bg-lime text-ink",
        outline: "border-line text-ink",
        warm: "border-[#e4cf8d] bg-[#fdf3d7] text-[#6d5810]",
        secondary: "border-transparent bg-paper-dim text-ink",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
