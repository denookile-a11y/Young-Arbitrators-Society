import type { Metadata } from "next";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { ContactForm } from "@/components/contact/contact-form";
import { getPublicContactSettings } from "@/lib/queries/public-settings";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  // Read from site_settings (cached, invalidated when an admin saves) so the
  // address shown here is the one the admin configured, not a constant.
  const contact = await getPublicContactSettings();

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Get In Touch"
        title="Contact YAS."
        subtitle="For partnership enquiries, media requests, or general questions."
        trail={[{ label: "Contact" }]}
        image={{
          src: "/img/wallpaper-nairobi-sunset-2.jpg",
          alt: "Nairobi skyline silhouetted at sunset",
          focus: "center 72%",
        }}
      />
      <ContactForm contactEmail={contact.contactEmail} />
      <SiteFooter />
    </>
  );
}
