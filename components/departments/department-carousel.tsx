"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  frontIndex,
  ringRadiusFactor,
  shortestAngle,
  type CarouselItem,
} from "@/lib/department-carousel";

/** Slow, continuous installation-style rotation: one full turn ≈ 55 s. */
const AUTO_DEG_PER_SEC = 6.5;
/**
 * With the OS "reduce motion" flag (also set by remote desktops/VMs and Windows
 * "animations off") the ring still turns, but half as fast — a frozen panel set
 * reads as broken. Hover, focus and drag still pause it.
 */
const AUTO_DEG_PER_SEC_REDUCED = 3;
/** Auto-rotation resumes this long after the last interaction. */
const RESUME_DELAY_MS = 2200;
/** Pointer travel (px) before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD = 6;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Homepage gateway: a horizontal 3D ring of real glass slabs.
 * Presentation layer only — items come from buildCarouselItems(), which uses
 * the same department data / imagery / lens resolvers as /departments.
 *
 * Native CSS 3D transforms; JS only drives one number (the ring angle) and
 * two custom properties per slab (facing + relative angle) for lighting.
 */
export function DepartmentCarousel({ items }: { items: CarouselItem[] }) {
  const n = items.length;
  const step = 360 / n;

  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLUListElement>(null);
  const slotRefs = useRef<(HTMLLIElement | null)[]>([]);

  const angle = useRef(0);
  const speed = useRef(0);
  const snap = useRef<number | null>(null);
  const paused = useRef(false);
  const dragging = useRef(false);
  const reduced = useRef(false);
  const visible = useRef(true);
  const frontRef = useRef(0);
  const suppressClick = useRef(false);
  const resumeTimer = useRef<number | undefined>(undefined);
  const kickRef = useRef<() => void>(() => {});

  const [front, setFront] = useState(0);

  const apply = useCallback(() => {
    const ring = ringRef.current;
    if (!ring) return;
    if (stageRef.current) stageRef.current.dataset.carousel = paused.current ? "paused" : "turning";
    ring.style.transform = `rotateX(5deg) translateZ(calc(var(--r) * -1)) rotateY(${-angle.current}deg)`;
    for (let i = 0; i < n; i++) {
      const slot = slotRefs.current[i];
      if (!slot) continue;
      const rel = shortestAngle(i * step - angle.current);
      slot.style.setProperty("--f", Math.cos((rel * Math.PI) / 180).toFixed(3));
      slot.style.setProperty("--rel", rel.toFixed(1));
    }
    const fi = frontIndex(angle.current, n);
    if (fi !== frontRef.current) {
      frontRef.current = fi;
      setFront(fi);
    }
  }, [n, step]);

  const pause = useCallback(() => {
    paused.current = true;
    window.clearTimeout(resumeTimer.current);
  }, []);
  const scheduleResume = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      paused.current = false;
      kickRef.current();
    }, RESUME_DELAY_MS);
  }, []);

  /** Bring panel `i` to the front by the shortest route. */
  const snapTo = useCallback(
    (i: number) => {
      const target = angle.current + shortestAngle(i * step - angle.current);
      snap.current = target;
      kickRef.current();
    },
    [step],
  );

  // --- animation loop -------------------------------------------------------
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;
    const onMq = () => {
      reduced.current = mq.matches;
      kickRef.current();
    };
    mq.addEventListener("change", onMq);

    let raf = 0;
    let last = 0;

    const frame = (t: number) => {
      raf = 0;
      if (!visible.current || document.hidden) return; // restarted by observers
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;

      if (snap.current !== null) {
        const diff = snap.current - angle.current;
        angle.current += diff * (1 - Math.exp(-dt * 4.5));
        speed.current = 0;
        if (Math.abs(diff) < 0.04) {
          angle.current = snap.current;
          snap.current = null;
        }
      } else if (!dragging.current) {
        const target = paused.current ? 0 : reduced.current ? AUTO_DEG_PER_SEC_REDUCED : AUTO_DEG_PER_SEC;
        speed.current += (target - speed.current) * (1 - Math.exp(-dt * 1.6));
        if (Math.abs(speed.current) < 0.001) speed.current = 0;
        angle.current += speed.current * dt;
      }

      // keep numbers small over long sessions
      if (angle.current >= 360) {
        angle.current -= 360;
        if (snap.current !== null) snap.current -= 360;
      } else if (angle.current <= -360) {
        angle.current += 360;
        if (snap.current !== null) snap.current += 360;
      }

      apply();

      const idle = snap.current === null && !dragging.current && speed.current === 0 && paused.current;
      if (!idle) raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (!raf && visible.current && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    kickRef.current = kick;

    apply();
    kick();

    const stage = stageRef.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        if (entry.isIntersecting) kick();
      },
      { rootMargin: "120px 0px" },
    );
    if (stage) io.observe(stage);
    document.addEventListener("visibilitychange", kick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", kick);
      mq.removeEventListener("change", onMq);
      window.clearTimeout(resumeTimer.current);
    };
  }, [apply]);

  // --- drag to rotate (pointer capture only after a real drag begins) -------
  const drag = useRef<{ x: number; a0: number; active: boolean; lastX: number; lastT: number; v: number } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { x: e.clientX, a0: angle.current, active: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      d.active = true;
      dragging.current = true;
      snap.current = null;
      pause();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      kickRef.current();
    }
    const panelW = ringRef.current?.firstElementChild?.firstElementChild?.getBoundingClientRect().width || 300;
    angle.current = d.a0 - (dx * step) / Math.max(120, panelW * 0.9);
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) d.v = ((d.lastX - e.clientX) * step) / Math.max(120, panelW * 0.9) / dt; // deg/ms
    d.lastX = e.clientX;
    d.lastT = now;
    apply();
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    dragging.current = false;
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 60);
    if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
    snapTo(frontIndex(angle.current + d.v * 180, n));
    scheduleResume();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      pause();
      snapTo((frontRef.current + (e.key === "ArrowRight" ? 1 : -1) + n) % n);
      scheduleResume();
    }
  };

  const rk = ringRadiusFactor(n);
  // Wide ring on desktop; a tighter ring on phones so neighbouring panels still peek into view.
  const stageVars: Vars = { "--rk-d": rk, "--rk-m": ringRadiusFactor(n, 1.22), "--step": `${step}deg` };
  const active = items[front];

  return (
    <div
      ref={stageRef}
      className="dc-stage"
      style={stageVars}
      role="group"
      aria-roledescription="carousel"
      aria-label="YAS departments"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") pause();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && !dragging.current) scheduleResume();
      }}
      onFocusCapture={pause}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) scheduleResume();
      }}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div className="dc-bg" aria-hidden="true">
        <span className="dc-floor" />
        <span className="dc-arc dc-arc-a" />
        <span className="dc-arc dc-arc-b" />
        <span className="dc-ghost dc-ghost-a" />
        <span className="dc-ghost dc-ghost-b" />
        <span className="dc-ghost dc-ghost-c" />
      </div>

      <div className="dc-scene">
        <ul ref={ringRef} className="dc-ring" style={{ transform: "rotateX(5deg) translateZ(calc(var(--r) * -1)) rotateY(0deg)" }}>
          {items.map((item, i) => {
            const slotVars: Vars = { "--i": i, "--f": i === 0 ? 1 : 0, "--rel": 0 };
            const isFront = i === front;
            return (
              <li
                key={item.key}
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
                className="dc-slot"
                style={slotVars}
                data-front={isFront}
                data-lens={item.kind === "department" ? item.lens : undefined}
              >
                <div className="dc-slab">
                  {item.kind === "department" ? (
                    <Link
                      href={item.href}
                      className="dc-face dc-front"
                      aria-label={item.name}
                      aria-current={isFront ? "true" : undefined}
                      draggable={false}
                      onFocus={() => {
                        if (frontRef.current !== i) snapTo(i);
                      }}
                      onClick={(e) => {
                        // A side panel first turns to the front; the front panel opens the department.
                        if (frontRef.current !== i) {
                          e.preventDefault();
                          pause();
                          snapTo(i);
                          scheduleResume();
                        }
                      }}
                    >
                      <span className="dc-photo">
                        <Image
                          src={item.src}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 400px, 60vw"
                          draggable={false}
                          style={{ objectPosition: item.objectPosition }}
                          className="object-cover"
                        />
                      </span>
                      <span className="dc-cap">
                        <span className="dc-name">{item.name}</span>
                        <span className="dc-pill">Explore</span>
                      </span>
                      <span className="dc-sheen" aria-hidden="true" />
                      <span className="dc-veil" aria-hidden="true" />
                    </Link>
                  ) : (
                    <div className="dc-face dc-front dc-future" role="img" aria-label="Future department — space reserved">
                      <span className="dc-future-frame" aria-hidden="true">
                        <span className="dc-future-eyebrow">Future</span>
                        <span className="dc-future-rule" />
                        <span className="dc-future-note">Space reserved</span>
                      </span>
                      <span className="dc-sheen" aria-hidden="true" />
                      <span className="dc-veil" aria-hidden="true" />
                    </div>
                  )}
                  <div className="dc-face dc-back" aria-hidden="true">
                    <span className="dc-sheen" />
                  </div>
                  <span className="dc-edge dc-edge-l" aria-hidden="true" />
                  <span className="dc-edge dc-edge-r" aria-hidden="true" />
                  <span className="dc-edge dc-edge-t" aria-hidden="true" />
                  <span className="dc-edge dc-edge-b" aria-hidden="true" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="sr-only" aria-live="polite">
        {active?.kind === "department" ? `Showing ${active.name}` : "Showing a space reserved for a future department"}
      </p>
    </div>
  );
}
