import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui Button (new-york style), themed to Turno's ink/lime brand.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-ink text-paper shadow hover:bg-ink/90",
        lime: "bg-lime text-ink shadow hover:bg-lime/85",
        outline: "border border-line bg-transparent text-ink shadow-sm hover:bg-paper-dim",
        ghostDark: "bg-ink/5 text-paper hover:bg-ink/10",
        ghost: "text-ink hover:bg-ink/5",
        dark: "bg-paper text-ink shadow hover:bg-paper/90",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-[13.5px]",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
