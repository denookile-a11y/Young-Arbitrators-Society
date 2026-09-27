import Image from "next/image";
import Link from "next/link";

export function Breadcrumbs({
  trail,
  onImage = false,
}: {
  trail: { label: string; href?: string }[];
  onImage?: boolean;
}) {
  return (
    <div
      className={`mb-6 flex flex-wrap items-center gap-2 text-[0.78rem] ${
        onImage ? "text-white/70" : "text-white/55"
      }`}
    >
      <Link href="/" className="hover:text-gold-soft">
        YAS
      </Link>
      {trail.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <span className="opacity-40">/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-gold-soft">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-white">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Wallpaper photograph config for a PageHero. `focus` sets object-position
 *  so the subject stays visible across the crop range from a 360px phone
 *  up to a widescreen desktop — most of these source photos are portrait
 *  orientation with the subject in the upper half. */
export interface PageHeroImage {
  src: string;
  alt: string;
  focus?: string; // CSS object-position value, e.g. "center 20%"
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  trail,
  image,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  trail: { label: string; href?: string }[];
  image?: PageHeroImage;
}) {
  if (image) {
    return (
      <section className="relative overflow-hidden px-6 pb-14 pt-[180px] text-white md:px-10">
        {/* Layer 1: supplied photograph */}
        <div className="absolute inset-0">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="100vw"
            priority
            className="object-cover"
            style={{ objectPosition: image.focus ?? "center 22%" }}
          />
        </div>
        {/* Layer 2: brand-navy overlay for text readability — restrained,
            corporate, not a heavy vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(10,26,60,0.90) 0%, rgba(10,26,60,0.74) 45%, rgba(10,26,60,0.55) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(10,26,60,0.55) 0%, transparent 35%)",
          }}
        />

        {/* Layer 3: content, in a restrained glass panel */}
        <div className="relative z-10 mx-auto max-w-[1240px]">
          <Breadcrumbs trail={trail} onImage />
          <div
            className="max-w-[720px] rounded-[3px] border px-6 py-7 sm:px-8 sm:py-8"
            style={{
              background: "rgba(10, 26, 60, 0.42)",
              borderColor: "rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <span className="mb-[14px] block text-[0.8rem] font-bold tracking-wide text-gold-soft">
              {eyebrow}
            </span>
            <h1 className="mb-4 font-serif text-[clamp(2rem,4.4vw,3.4rem)] font-normal leading-[1.08] tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="max-w-[560px] text-[1rem] leading-relaxed text-white/85">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-deep via-[#0d2148] to-navy-mid px-6 pb-14 pt-[180px] text-white md:px-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 85% 20%, rgba(184,145,47,0.08) 0%, transparent 45%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-[1240px]">
        <Breadcrumbs trail={trail} />
        <span className="mb-[18px] block text-[0.8rem] font-bold tracking-wide text-gold-soft">
          {eyebrow}
        </span>
        <h1 className="mb-5 max-w-[780px] font-serif text-[clamp(2.2rem,4.6vw,3.6rem)] font-normal leading-[1.08] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-[560px] text-[1.02rem] leading-relaxed text-white/72">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
