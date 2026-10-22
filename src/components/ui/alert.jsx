import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui Alert, themed.
const alertVariants = cva("relative w-full rounded-xl border px-4 py-3.5 text-sm leading-relaxed", {
  variants: {
    variant: {
      default: "bg-paper text-ink border-line",
      warm: "border-[#e4cf8d] bg-[#fdf3d7] text-[#57460c]",
      dark: "border-ink bg-ink text-paper/90 [&>strong]:text-lime",
    },
  },
  defaultVariants: { variant: "default" },
});

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div role="alert" ref={ref} className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

export { Alert };
