"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./leadership-motion.module.css";

type RevealState = "pending" | "in" | "past";

const THRESHOLDS = [0, 0.05, 0.15, 0.3, 0.5, 0.7, 0.9, 1];

/**
 * Leadership-only scroll reveal. Wraps a leadership block (a card, a biography
 * panel, a section label) and drives the data-state that
 * leadership-motion.module.css reads: blur-to-focus on entry, a gentle soften
 * on exit through the top. It is a plain IntersectionObserver: it never
 * intercepts, delays or snaps scrolling, and it observes only its own wrapper.
 * Under prefers-reduced-motion it reveals immediately and attaches nothing.
 */
export function LeadershipReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Extra start delay in ms, for neighbours entering together (kept small). */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>("pending");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion: the stylesheet already shows everything sharp and still,
    // so no observer and no state change are needed.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Without IntersectionObserver there is nothing to wait for: reveal on the next tick.
    if (typeof window.IntersectionObserver === "undefined") {
      const t = window.setTimeout(() => setState("in"), 0);
      return () => window.clearTimeout(t);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const r = entry.boundingClientRect;
          const vh = window.innerHeight;
          setState((prev) => {
            if (!entry.isIntersecting) {
              // Fully above the viewport: soften if it had been seen, otherwise just show it.
              if (r.bottom <= 0) return prev === "pending" ? "in" : "past";
              return prev; // below the viewport: stay as is
            }
            // Its lower edge has risen into the top half of the screen: it is leaving.
            if (r.top < 0 && r.bottom < vh * 0.5) return prev === "pending" ? "in" : "past";
            return entry.intersectionRatio >= 0.05 || r.top < vh * 0.9 ? "in" : prev;
          });
        }
      },
      { threshold: THRESHOLDS, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-state={state}
      className={`${styles.reveal}${className ? ` ${className}` : ""}`}
      style={{ "--base": `${Math.max(0, Math.min(delay, 400))}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
