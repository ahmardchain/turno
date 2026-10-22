import { cn } from "@/lib/utils";

// Magic UI-style Marquee: content scrolls in a seamless loop.
export function Marquee({ children, className, innerClassName }) {
  return (
    <div className={cn("group flex overflow-hidden [--gap:2.75rem] [gap:var(--gap)]", className)}>
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className={cn(
            "flex shrink-0 items-center justify-around [gap:var(--gap)] animate-marquee group-hover:[animation-play-state:paused]",
            innerClassName
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
