import Image from "next/image";

/**
 * The existing YAS emblem, presented as an institutional seal.
 *
 * The asset (/img/yas-logo-web.jpg, 768x512) is the circular gold-and-crystal
 * seal on a champagne backdrop. It is not redrawn or altered: the image is
 * scaled uniformly (aspect ratio preserved) and positioned so the seal's own
 * circumference fills a round frame. Percentages below are the seal's centre
 * (386, 255) and diameter (~444px) within the 768x512 source.
 */
export function YasSeal({
  className = "",
  rings = true,
  priority = true,
}: {
  className?: string;
  rings?: boolean;
  priority?: boolean;
}) {
  return (
    <div className={`relative aspect-square ${className}`}>
      {/* Concentric hairlines give the seal room to breathe. */}
      {rings && (
        <>
          <span aria-hidden className="absolute -inset-4 rounded-full border border-gold/45 md:-inset-5" />
          <span aria-hidden className="absolute -inset-9 rounded-full border border-navy-deep/15 md:-inset-11" />
        </>
      )}

      <div className="relative h-full w-full overflow-hidden rounded-full shadow-[0_26px_60px_-8px_rgba(10,26,60,0.38)] ring-1 ring-gold/70">
        <Image
          src="/img/yas-logo-web.jpg"
          alt="Seal of the Young Arbitrators Society, Kenyatta University School of Law"
          width={768}
          height={512}
          sizes="(min-width: 1024px) 440px, 260px"
          priority={priority}
          className="absolute max-w-none"
          style={{ width: "173%", height: "auto", left: "-36.9%", top: "-7.4%" }}
        />
      </div>
    </div>
  );
}
