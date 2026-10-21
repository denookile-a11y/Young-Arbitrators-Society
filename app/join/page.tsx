import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { JoinForm } from "@/components/join/join-form";

export default function JoinPage() {
  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Membership"
        title="Join the Society."
        subtitle="Open to law students at Kenyatta University with an interest in arbitration and ADR."
        trail={[{ label: "Join YAS" }]}
        image={{
          src: "/img/wallpaper-nairobi-sunset-1.jpg",
          alt: "Nairobi skyline at golden hour",
          focus: "center 45%",
        }}
      />
      <JoinForm />
      <SiteFooter />
    </>
  );
}
