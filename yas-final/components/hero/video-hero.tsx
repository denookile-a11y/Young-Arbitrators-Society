"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function VideoHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Intentional: syncing from a real external system (the OS-level media
    // query) on mount, then subscribing to its changes below — not
    // deriving state from props/state already available to React.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const video = videoRef.current;
    if (!video) return;

    // Autoplay can be blocked by the browser even with muted+playsInline in
    // rare cases (e.g. very restrictive mobile data-saver modes). If play()
    // rejects, fall back to the poster image rather than showing a paused,
    // dead-looking video frame with no explanation.
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => setVideoFailed(true));
    }

    // Pause the video once it scrolls out of view (performance — no need to
    // decode frames for a hero the user has scrolled past) and resume if
    // they scroll back up to it.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const showVideo = !reducedMotion && !videoFailed;

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[92vh] items-end overflow-hidden text-white"
    >
      {/* Layer 1: video (or poster-only fallback) */}
      <div className="absolute inset-0">
        {showVideo ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            style={{ objectPosition: "center" }}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/img/yas-hero-poster.jpg"
            aria-hidden="true"
            tabIndex={-1}
            onError={() => setVideoFailed(true)}
          >
            <source src="/video/yas-hero.webm" type="video/webm" />
            <source src="/video/yas-hero.mp4" type="video/mp4" />
          </video>
        ) : (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: "url(/img/yas-hero-poster.jpg)" }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Layer 2: cinematic overlay — darker left (where type sits), lighter right */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(10,26,60,0.88) 0%, rgba(10,26,60,0.65) 40%, rgba(10,26,60,0.35) 70%, rgba(10,26,60,0.25) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(10,26,60,0.5) 0%, transparent 30%, transparent 70%, rgba(10,26,60,0.3) 100%)",
        }}
      />

      {/* Layer 3: hero content */}
      <div className="relative z-10 mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-14 px-6 pb-20 pt-16 md:grid-cols-[1.5fr_1px_1fr] md:px-10">
        <div>
          <span className="mb-5 block animate-[riseIn_0.9s_ease_0.1s_both] text-[0.8rem] font-bold tracking-wide text-gold-soft">
            Kenyatta University School of Law
          </span>
          <h1 className="mb-6 animate-[riseIn_0.9s_ease_0.25s_both] font-serif text-[clamp(2.6rem,5.6vw,4.6rem)] font-normal leading-[1.04] tracking-tight">
            Shaping the future of
            <br />
            <em className="font-light not-italic italic text-gold-soft">arbitration</em> and
            dispute resolution.
          </h1>
          <p className="mb-9 max-w-[480px] animate-[riseIn_0.9s_ease_0.4s_both] text-[1.08rem] leading-relaxed text-white/72">
            Young Arbitrators Society trains, publishes, and convenes the
            next generation of ADR practitioners — through moot advocacy,
            research, and institutional partnership.
          </p>
          <div className="flex animate-[riseIn_0.9s_ease_0.55s_both] flex-wrap gap-4">
            <Link
              href="/about"
              className="group inline-flex items-center gap-2 rounded-[2px] bg-gold px-[26px] py-[15px] text-[0.84rem] font-bold text-navy-deep transition-colors hover:bg-gold-soft"
            >
              Explore YAS
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/join"
              className="group inline-flex items-center gap-2 rounded-[2px] border border-white/35 px-[26px] py-[15px] text-[0.84rem] font-bold text-white transition-colors hover:border-white hover:bg-white/6"
            >
              Join the Society
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="hidden bg-white/16 md:block" />

        <div className="animate-[riseIn_0.9s_ease_0.5s_both]">
          <p className="mb-4 font-serif text-[1.25rem] font-light italic leading-relaxed text-white/88">
            &ldquo;Where a moot problem is drafted with the same care as a
            real submission, and a research paper is expected to hold up
            under cross-examination.&rdquo;
          </p>
          <span className="block text-[0.78rem] font-semibold text-gold-soft">
            — Founding Charter, Young Arbitrators Society
          </span>
          <div className="mt-7 flex flex-col gap-1.5 border-t border-white/16 pt-5 text-[0.76rem] font-medium text-white/45">
            <span>Est. Kenyatta University School of Law</span>
            <span>2025/26 Administration</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-7 left-6 z-10 flex items-center gap-2.5 text-[0.72rem] font-semibold text-white/50 md:left-10">
        <div className="relative h-9 w-px overflow-hidden bg-white/30">
          <div className="animate-scroll-indicator absolute inset-0" />
        </div>
        Scroll
      </div>
    </section>
  );
}
