import { cn } from "@/lib/utils";

// Aceternity/Magic UI-style dot background (SVG pattern, masked at the edges).
export function DotPattern({ className }) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-paper/15 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]",
        className
      )}
    >
      <defs>
        <pattern id="turno-dots" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="1.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#turno-dots)" />
    </svg>
  );
}
