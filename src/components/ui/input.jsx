import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Input, themed.
const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-line bg-paper px-3.5 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
