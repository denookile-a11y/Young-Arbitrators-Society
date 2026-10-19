import type { Metadata } from "next";
import Link from "next/link";
import { heroImage } from "@/lib/wallpapers";
import { ContactLine, LegalDocument, type LegalSection } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that apply to your use of the Young Arbitrators Society website.",
};

const LAST_UPDATED_TERMS = "9 October 2026";

const link = "font-semibold text-navy-deep underline decoration-gold underline-offset-4";

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    body: (
      <p>
        By accessing or using this website, you accept these Terms of Use. If you do not agree with them, please do not
        use the website. Where you use the website on behalf of an organisation, you confirm that you are authorised to
        do so.
      </p>
    ),
  },
  {
    id: "about",
    title: "About the Website",
    body: (
      <p>
        This website of the Young Arbitrators Society (&ldquo;YAS&rdquo;), Kenyatta University School of Law, provides
        information and digital services relating to YAS activities, including its programmes, events, publications,
        research, mooting, training and related institutional activities.
      </p>
    ),
  },
  {
    id: "permitted-use",
    title: "Permitted Use",
    body: (
      <>
        <p>You may:</p>
        <ul>
          <li>browse the website;</li>
          <li>access publicly available materials;</li>
          <li>submit information through the legitimate forms provided; and</li>
          <li>use website features for their intended purposes.</li>
        </ul>
      </>
    ),
  },
  {
    id: "prohibited-conduct",
    title: "Prohibited Conduct",
    body: (
      <>
        <p>You must not:</p>
        <ul>
          <li>use the website for any unlawful activity;</li>
          <li>gain or attempt to gain unauthorised access to the website, its administrative areas, accounts or data;</li>
          <li>attempt to compromise, disrupt or overload the website or its security;</li>
          <li>introduce viruses, malicious code or harmful material;</li>
          <li>scrape or harvest content in a way that breaches applicable restrictions;</li>
          <li>impersonate another person or misrepresent your identity or affiliation;</li>
          <li>make fraudulent or deliberately false submissions;</li>
          <li>misuse event, membership or application systems;</li>
          <li>infringe the intellectual property or other rights of YAS or others; or</li>
          <li>harass others or use forms and services abusively, including by sending repeated or automated submissions.</li>
        </ul>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    body: (
      <>
        <p>
          The YAS name, branding, logos, visual assets, original publications, written material and other protected
          content on this website belong to YAS or their respective rights holders, unless otherwise indicated.
        </p>
        <p>
          Third-party material, including material contributed by authors, speakers, partners and photographers,
          remains the property of its owners. YAS does not claim ownership of it. Unless a licence or applicable law
          allows it, you may not reproduce or republish protected content without permission. Short, properly
          attributed extracts for study, research or reporting may be permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "publications",
    title: "Publications and Information",
    body: (
      <p>
        Content on this website is provided for general informational and institutional purposes. It does not
        constitute legal advice, and no lawyer-client relationship is created by your use of the website or by
        contacting YAS. Views in publications and research are those of their authors. You should obtain advice from a
        qualified advocate about your particular circumstances.
      </p>
    ),
  },
  {
    id: "events",
    title: "Events, Moots and Programmes",
    body: (
      <p>
        Participation in events, moots, conferences, training and other programmes may be subject to additional
        event-specific rules, registration requirements and eligibility conditions. Where these apply, they will be
        communicated to you, and they apply together with these Terms.
      </p>
    ),
  },
  {
    id: "external-links",
    title: "External Links",
    body: (
      <p>
        The website may link to third-party websites. YAS does not control them and is not responsible for their content
        or practices merely because the website links to them. A link is not an endorsement.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability",
    body: (
      <p>
        We do not promise that the website will be available without interruption. It may occasionally be unavailable
        or limited because of maintenance, updates, infrastructure issues or circumstances beyond YAS&rsquo;s reasonable
        control. We may change, suspend or withdraw features or content at any time.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Disclaimer and Limitation of Liability",
    body: (
      <>
        <p>
          The website and its content are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. YAS
          is a student-led society and does not give warranties that the website will be error-free, complete or
          up to date.
        </p>
        <p>
          To the extent permitted by Kenyan law, YAS is not liable for loss or damage arising from your use of, or
          inability to use, the website, or from reliance on its content. Nothing in these Terms excludes or limits any
          liability that cannot lawfully be excluded or limited, or affects any rights you have as a consumer or data
          subject under applicable law.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    body: (
      <p>
        Your use of the website is also governed by our{" "}
        <Link href="/privacy" className={link}>Privacy Policy</Link>, which explains how personal data is handled.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        YAS may update these Terms from time to time. The current version will be published on this page with the date
        it was last updated. Continued use of the website after an update means you accept the revised Terms.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing Law",
    body: (
      <p>
        These Terms are governed by the laws of Kenya, subject to any mandatory provisions of applicable law.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <p>For questions about these Terms, please contact YAS at <ContactLine />.</p>
        <p className="text-sm font-semibold text-navy-deep">Last updated: {LAST_UPDATED_TERMS}</p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Website Terms"
      title="Terms of Use"
      subtitle="The terms that apply when you use the Young Arbitrators Society website."
      lastUpdated={LAST_UPDATED_TERMS}
      trailLabel="Terms of Use"
      image={heroImage("termsLegal")}
      sections={sections}
    />
  );
}
