import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Magic UI-style BlurFade: content fades/rises in when it scrolls into view.
export function BlurFade({ children, className, delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        shown ? "opacity-100 translate-y-0 blur-none" : "opacity-0 translate-y-5 blur-[5px]",
        className
      )}
    >
      {children}
    </div>
  );
}
