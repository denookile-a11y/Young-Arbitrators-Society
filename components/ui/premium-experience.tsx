"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Public-site polish, mounted once in the root layout:
 *  - eased wheel scrolling (Lenis; native touch scrolling is left alone)
 *  - a soft penumbra of light that follows the pointer (it glows on dark
 *    surfaces and fades out on light ones, via a screen blend)
 *  - a specular light that tracks the pointer across crystal panels
 *  - gentle magnetic pull on glass buttons
 * Everything is skipped for reduced motion, for the admin area, and (the
 * pointer effects) for touch / coarse-pointer devices.
 */
export function PremiumExperience() {
  const pathname = usePathname();
  const enabled = !pathname.startsWith("/admin");

  useEffect(() => {
    if (!enabled) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const cleanups: Array<() => void> = [];

    // --- Smooth scrolling -------------------------------------------------
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true });
    let raf = 0;
    const tick = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    cleanups.push(() => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    });

    // --- Pointer effects (fine pointers only) -----------------------------
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const ring = document.createElement("div");
      ring.setAttribute("aria-hidden", "true");
      ring.className = "premium-penumbra";
      document.body.appendChild(ring);

      let tx = -1000, ty = -1000, x = -1000, y = -1000, scale = 1, visible = false;
      // The loop only runs while the glow is still travelling; it sleeps when
      // settled and is woken by the next pointer move.
      let loop = 0;
      const animate = () => {
        loop = 0;
        const dx = tx - x;
        const dy = ty - y;
        x += dx * 0.14;
        y += dy * 0.14;
        ring.style.transform = `translate3d(${x - 280}px, ${y - 280}px, 0) scale(${scale})`;
        if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) loop = requestAnimationFrame(animate);
      };
      const wake = () => {
        if (!loop) loop = requestAnimationFrame(animate);
      };

      let pending: PointerEvent | null = null;
      let frame = 0;
      const handle = () => {
        frame = 0;
        const e = pending;
        if (!e) return;
        tx = e.clientX;
        ty = e.clientY;
        if (!visible) {
          visible = true;
          x = tx;
          y = ty;
          ring.style.opacity = "1";
        }
        const target = e.target as Element | null;
        const interactive = target?.closest("a, button, [role=button], summary, label, input, textarea, select");
        scale = interactive ? 1.18 : 1;
        wake();

        const panel = target?.closest<HTMLElement>(".crystal");
        if (panel) {
          const r = panel.getBoundingClientRect();
          panel.style.setProperty("--mx", `${e.clientX - r.left}px`);
          panel.style.setProperty("--my", `${e.clientY - r.top}px`);
        }
        const mag = target?.closest<HTMLElement>(".glass-cta");
        if (mag) {
          const r = mag.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
          const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
          mag.style.setProperty("--tx", `${(dx * 8).toFixed(1)}px`);
          mag.style.setProperty("--ty", `${(dy * 6).toFixed(1)}px`);
        }
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        pending = e;
        if (!frame) frame = requestAnimationFrame(handle);
      };
      const onOut = (e: PointerEvent) => {
        const t = e.target as HTMLElement | null;
        const mag = t?.closest<HTMLElement>(".glass-cta");
        if (mag) {
          mag.style.removeProperty("--tx");
          mag.style.removeProperty("--ty");
        }
        if (!e.relatedTarget) {
          visible = false;
          ring.style.opacity = "0";
        }
      };
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerout", onOut, { passive: true });
      cleanups.push(() => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerout", onOut);
        cancelAnimationFrame(loop);
        cancelAnimationFrame(frame);
        ring.remove();
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [enabled]);

  return null;
}
