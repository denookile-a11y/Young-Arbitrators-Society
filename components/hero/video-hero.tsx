"use client";

import { useEffect, useRef, useState } from "react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { YasSeal } from "./yas-seal";

type Mode = "pending" | "video" | "static";
type Blocked = "data-saver" | null;

const NARROW = "(max-width: 767px)";

// Portrait (4:5) reframe of the 720p master, cropped around the subject. The
// old mobile file was a 854x480 LANDSCAPE downscale: object-cover on a portrait
// phone magnified it ~4x and showed a slice that cut through the subject.
const MOBILE_VIDEO = "/video/yas-live-portrait.mp4";
const DESKTOP_POSTER = "/img/yas-live-poster.jpg";
const MOBILE_POSTER = "/img/yas-live-poster-portrait.jpg";

/**
 * Homepage hero.
 *
 * Layer order (back to front):
 *   1. static poster (always rendered — first paint, data-saver, fallback)
 *   2. looping atmospheric video, faded in once it can actually play
 *   3. navy readability overlay + warm glow behind the seal
 *   4. glass surfaces, the YAS seal and the typography
 *
 * The <video> is mounted only after the client has decided it is appropriate
 * (no data-saver request), so a single file is
 * requested — the portrait-framed file on narrow screens, WebM/MP4 on desktop.
 */
export function VideoHero() {
  // Art-directed poster: exactly one image is requested per viewport, and the
  // mobile one matches the mobile video's framing so the fade-in does not jump.
  const posterCommon = { alt: "", fill: true, priority: true, sizes: "100vw" } as const;
  const { props: desktopPoster } = getImageProps({ ...posterCommon, src: DESKTOP_POSTER });
  const { props: mobilePoster } = getImageProps({ ...posterCommon, src: MOBILE_POSTER });
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [decided, setDecided] = useState(false);
  const [blockedBy, setBlockedBy] = useState<Blocked>(null);
  const [narrow, setNarrow] = useState(false);
  const [ready, setReady] = useState(false);
  // Set only when the browser definitively cannot play any offered source.
  const [failed, setFailed] = useState(false);

  const wantsVideo = blockedBy === null;
  const mode: Mode = !decided ? "pending" : wantsVideo ? "video" : "static";

  useEffect(() => {
    const narrowMq = window.matchMedia(NARROW);
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

    // The background plays automatically. It is a slowed, soft-focus loop, so it
    // is deliberately NOT gated on the OS "reduce motion" flag (which is also set
    // by remote desktops, VMs and "animations off" on Windows and left visitors
    // with a permanent still). Only an explicit data-saver request holds it back.
    const decide = () => {
      setNarrow(narrowMq.matches);
      setFailed(false);
      setReady(false);
      const blocked: Blocked = conn?.saveData ? "data-saver" : null;
      setBlockedBy(blocked);
      setDecided(true);
      if (blocked && process.env.NODE_ENV !== "production") {
        console.info(`[VideoHero] showing the poster because the device reports "${blocked}".`);
      }
    };
    // Intentional: syncing from external systems (viewport, network hints) on
    // mount and on change — not derived from props or state.
    decide();
    narrowMq.addEventListener("change", decide);
    return () => {
      narrowMq.removeEventListener("change", decide);
    };
  }, []);

  useEffect(() => {
    if (mode !== "video") return;
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    // React does not reliably emit the `muted` attribute; autoplay policies
    // (notably iOS Safari) key off it, so set it before any play() attempt.
    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute("muted", "");

    // The hero is the first section, so assume visible until the observer says
    // otherwise — otherwise the first sync() could pause a video that just started.
    let inView = true;
    let cancelled = false;

    const sync = () => {
      if (cancelled) return;
      const eligible = inView && document.visibilityState === "visible";
      if (eligible) {
        if (!video.paused) return; // already playing — no repeated play() calls
        const attempt = video.play();
        if (attempt !== undefined) {
          attempt.catch((err: unknown) => {
            const name = err instanceof DOMException ? err.name : "";
            // AbortError: interrupted by pause()/reload/remount — routine, and
            // sync() will run again on the next event. Never treat as fatal.
            // NotAllowedError: autoplay blocked — keep the poster, retry on the
            // next gesture/visibility event. Only an unsupported source is final.
            if (name === "NotSupportedError") setFailed(true);
          });
        }
      } else if (!video.paused) {
        video.pause();
      }
    };

    // Don't decode frames for a hero that has scrolled out of view.
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0.05, rootMargin: "80px 0px" }
    );
    observer.observe(section);

    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);
    // Data may arrive after the first play() attempt; retry once playable.
    video.addEventListener("canplay", sync);
    // If autoplay was blocked, the first gesture is a legitimate retry point.
    const onGesture = () => sync();
    window.addEventListener("pointerdown", onGesture, { once: true, passive: true });
    window.addEventListener("keydown", onGesture, { once: true });

    sync();

    // Watchdog: if the video is eligible but not advancing (autoplay refused,
    // a stall, a throttled tab coming back), nudge it, and publish its state on
    // the section so a halted video can be diagnosed from DevTools.
    let lastT = -1;
    const watchdog = window.setInterval(() => {
      if (cancelled) return;
      const eligible = inView && document.visibilityState === "visible";
      if (process.env.NODE_ENV !== "production") section.dataset.videoDebug = `rs=${video.readyState} ns=${video.networkState} paused=${video.paused} t=${video.currentTime.toFixed(1)} err=${video.error?.code ?? 0} src=${video.currentSrc.split("/").pop() ?? ""}`;
      if (!eligible) return;
      const stuck = !video.paused && video.currentTime === lastT && video.readyState < 3;
      lastT = video.currentTime;
      if (video.paused || stuck) {
        if (stuck && video.networkState === HTMLMediaElement.NETWORK_IDLE) video.load();
        sync();
      }
    }, 2000);
    // A refused source is retried once per page view before giving up for good.
    const retryAfterFailure = () => setFailed(false);
    window.addEventListener("pointerdown", retryAfterFailure, { once: true, passive: true });

    return () => {
      cancelled = true;
      window.clearInterval(watchdog);
      window.removeEventListener("pointerdown", retryAfterFailure);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video.removeEventListener("canplay", sync);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [mode, narrow]);

  const showVideo = mode === "video" && !failed;

  return (
    <section
      ref={sectionRef}
      data-hero-state={failed ? "failed" : mode === "video" ? "video" : blockedBy ? `static-${blockedBy}` : "pending"}
      className="relative flex min-h-[92vh] items-end overflow-hidden bg-ivory text-navy-deep supports-[overflow:clip]:max-md:overflow-clip"
    >
      {/*
        Layers 1 and 2 share ONE frame so the poster and the video always cover exactly the same area.
        Desktop and tablet: the frame is the whole hero (unchanged). Phones: the hero is taller than the
        screen (the text stacks in flow), and covering that whole box magnified the 4:5 portrait source
        about 1.4x and showed under half of its width. So on phones the frame is one screen tall and
        pinned while the hero scrolls over it; the footage is cropped from the screen's proportions
        instead of the page's. Without `overflow: clip` support it falls back to the old full-hero fill.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="relative h-full w-full supports-[overflow:clip]:max-md:sticky supports-[overflow:clip]:max-md:top-0 supports-[overflow:clip]:max-md:h-screen supports-[overflow:clip]:max-md:max-h-full">
      {/* Layer 1 — static poster */}
      <picture>
        <source media="(min-width: 768px)" srcSet={desktopPoster.srcSet} sizes="100vw" />
        <source media="(max-width: 767px)" srcSet={mobilePoster.srcSet} sizes="100vw" />
        <img
          src={desktopPoster.src}
          alt=""
          fetchPriority="high"
          decoding="async"
          style={desktopPoster.style}
          className="object-cover"
        />
      </picture>

      {/* Layer 2 — live background */}
      {showVideo && (
        <video
          key={narrow ? "narrow" : "wide"}
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out ${
            ready ? "opacity-100" : "opacity-0"
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload={narrow ? "metadata" : "auto"}
          poster={narrow ? MOBILE_POSTER : DESKTOP_POSTER}
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
          onLoadedData={() => setReady(true)}
          onError={() => setFailed(true)}
        >
          {narrow ? (
            <source src={MOBILE_VIDEO} type="video/mp4" onError={() => setFailed(true)} />
          ) : (
            <>
              <source src="/video/yas-live.webm" type="video/webm" />
              <source src="/video/yas-live.mp4" type="video/mp4" onError={() => setFailed(true)} />
            </>
          )}
        </video>
      )}
        </div>
      </div>

      {/* Layer 3 — readability: darker where the type sits, lighter at the seal */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(98deg, rgba(247,243,234,0.86) 0%, rgba(247,243,234,0.7) 28%, rgba(247,243,234,0.22) 50%, rgba(247,243,234,0) 68%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(247,243,234,0.5) 0%, transparent 18%, transparent 72%, rgba(247,248,250,0.92) 100%)",
        }}
      />

      {/* Layer 4 — content */}
      <div className="relative z-10 mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-12 px-6 pb-20 pt-28 md:grid-cols-[1.45fr_1px_1fr] md:gap-14 md:px-10 md:pt-24">
        <div>
          <span className="mb-5 block animate-[riseIn_0.9s_ease_0.1s_both] text-[0.8rem] font-bold tracking-wide text-[#6f5013]">
            Kenyatta University School of Law
          </span>
          <h1 className="mb-6 animate-[riseIn_0.9s_ease_0.25s_both] font-serif text-[clamp(2.5rem,4.9vw,4.4rem)] font-normal leading-[1.04] tracking-tight text-navy-deep">
            Shaping the future of
            <br />
            <em className="font-light not-italic italic text-gold-on-light">arbitration</em> and
            dispute resolution.
          </h1>
          <p className="mb-9 max-w-[480px] animate-[riseIn_0.9s_ease_0.4s_both] text-[1.08rem] leading-relaxed text-ink-soft">
            Young Arbitrators Society trains, publishes, and convenes the
            next generation of ADR practitioners — through moot advocacy,
            research, and institutional partnership.
          </p>
          <div className="flex animate-[riseIn_0.9s_ease_0.55s_both] flex-wrap gap-4">
            <Link
              href="/about"
              className="glass-cta glass-cta-navy group inline-flex min-h-12 items-center gap-2 px-[26px] py-[15px] text-[0.84rem] font-bold"
            >
              Explore YAS
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/join"
              className="glass-cta glass-cta-light group inline-flex min-h-12 items-center gap-2 px-[26px] py-[15px] text-[0.84rem] font-bold"
            >
              Join the Society
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="hidden bg-gradient-to-b from-transparent via-gold/50 to-transparent md:block" />

        <div className="relative order-first flex animate-[riseIn_1.1s_ease_0.2s_both] flex-col items-center justify-center md:order-none md:self-center">
          {/* Warm glow so the gold seal sits in light of its own. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[42%] h-[135%] w-[135%] -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,255,255,0.7), rgba(255,250,235,0.35) 55%, rgba(255,255,255,0) 100%)",
            }}
          />
          <YasSeal className="w-[clamp(210px,min(32vw,50vh),430px)]" />
          <div className="glass-light relative mt-12 flex flex-col items-center gap-1 px-7 py-3.5 text-center text-[0.76rem] font-medium text-ink md:mt-16">
            <span>Est. Kenyatta University School of Law</span>
            <span className="font-semibold text-[#6f5013]">2025/26 Administration</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-7 left-6 z-10 flex items-center gap-2.5 text-[0.72rem] font-semibold text-ink-soft md:left-10">
        <div className="relative h-9 w-px overflow-hidden bg-navy-deep/30">
          <div className="animate-scroll-indicator absolute inset-0" />
        </div>
        Scroll
      </div>
    </section>
  );
}
