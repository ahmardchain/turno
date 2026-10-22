import { cn } from "@/lib/utils";

// Magic UI-style BorderBeam: a lime light travels the border of its parent.
// Parent must be `relative` with a border and rounded corners + overflow visible
// only for the beam layer itself (the beam is clipped to the border box).
export function BorderBeam({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        "[border:1.5px_solid_transparent]",
        "[background:linear-gradient(90deg,transparent_0%,#c8f169_12%,transparent_26%)_border-box]",
        "[background-size:250%_100%]",
        "[mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]",
        "animate-beam",
        className
      )}
    />
  );
}
