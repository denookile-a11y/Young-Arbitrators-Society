import Link from "next/link";

export function Breadcrumbs({
  trail,
}: {
  trail: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 text-[0.78rem] text-white/55">
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

export function PageHero({
  eyebrow,
  title,
  subtitle,
  trail,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  trail: { label: string; href?: string }[];
}) {
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
