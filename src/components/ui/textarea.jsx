import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Textarea, themed.
const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink shadow-sm placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
