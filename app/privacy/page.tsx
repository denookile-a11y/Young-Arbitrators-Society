import type { Metadata } from "next";
import Link from "next/link";
import { Callout, ContactLine, LegalDocument, type LegalSection } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How the Young Arbitrators Society, Kenyatta University School of Law, collects, uses, stores and protects personal data.",
};

const LAST_UPDATED_PRIVACY = "9 October 2026";

const sections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    body: (
      <>
        <p>
          The Young Arbitrators Society (&ldquo;YAS&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) respects the privacy of its members,
          students, visitors, applicants, participants, judges, speakers, partners and other users of this website.
        </p>
        <p>
          This notice explains how personal data is collected, used, stored, protected and disclosed. It applies to
          the YAS website and to the interactions you have with YAS through it. It is prepared with regard to the
          Kenya Data Protection Act, 2019, the regulations made under it, and guidance issued by the Office of the
          Data Protection Commissioner (ODPC).
        </p>
      </>
    ),
  },
  {
    id: "who-we-are",
    title: "Who We Are",
    body: (
      <p>
        YAS is the Young Arbitrators Society at Kenyatta University School of Law, Kenya, a student-led society
        dedicated to the study and practice of arbitration and alternative dispute resolution. For the purposes of
        this notice, YAS is the party that determines how and why personal data collected through this website is
        processed.
      </p>
    ),
  },
  {
    id: "data-we-collect",
    title: "Personal Data We May Collect",
    body: (
      <>
        <p>Depending on how you use the website, we may process the following categories of personal data:</p>
        <ul>
          <li>
            <strong>Contact enquiries:</strong> your name, email address and the content of the message you send us.
          </li>
          <li>
            <strong>Membership applications:</strong> your full name, email address and, where you choose to provide
            it, your year of study.
          </li>
          <li>
            <strong>Newsletter subscriptions:</strong> your email address and the point at which you subscribed.
          </li>
          <li>
            <strong>Administrative accounts:</strong> for authorised YAS personnel only, account and authentication
            information needed to operate the administrative area.
          </li>
          <li>
            <strong>Photographs and media:</strong> images and recordings relating to YAS activities, where they are
            published in the gallery, publications or event pages.
          </li>
          <li>
            <strong>Technical information:</strong> information such as IP address, browser and device details that is
            generated in the ordinary operation and security of the website.
          </li>
        </ul>
        <p>
          We do not intend to collect more personal data than is needed for the purpose concerned. Where a form field
          is optional, it is marked or treated as such.
        </p>
      </>
    ),
  },
  {
    id: "how-we-collect",
    title: "How We Collect Personal Data",
    body: (
      <>
        <p>
          <strong>Information you provide voluntarily.</strong> This includes details you submit through the contact
          form, membership application form and newsletter sign-up, and anything you send to us in correspondence or
          in connection with an event, moot or programme.
        </p>
        <p>
          <strong>Information generated through ordinary website operation.</strong> When you visit the website, your
          browser communicates with our servers and hosting providers, which can result in technical information such
          as IP address and request details being processed. We also use such information to limit repeated or abusive
          form submissions.
        </p>
        <p>
          <strong>Administrative processes.</strong> Authorised YAS personnel may create or update records, for example
          when processing applications, managing events or publishing content.
        </p>
      </>
    ),
  },
  {
    id: "why-we-use",
    title: "Why We Use Personal Data",
    body: (
      <>
        <p>We use personal data for specific and legitimate purposes, including to:</p>
        <ul>
          <li>administer YAS activities and processes;</li>
          <li>process membership applications and manage membership;</li>
          <li>communicate with members, applicants and participants;</li>
          <li>organise events, moots, conferences and training;</li>
          <li>maintain institutional records;</li>
          <li>publish authorised institutional content;</li>
          <li>respond to enquiries;</li>
          <li>improve website functionality;</li>
          <li>maintain the security and integrity of the website; and</li>
          <li>comply with applicable legal obligations.</li>
        </ul>
        <p>
          We apply the principles of purpose limitation and data minimisation: personal data is used for the purposes
          for which it was collected, or compatible purposes, and is not collected beyond what is reasonably needed.
        </p>
      </>
    ),
  },
  {
    id: "lawful-basis",
    title: "Lawful Basis for Processing",
    body: (
      <>
        <p>
          Kenyan data protection law requires that personal data is processed on a recognised lawful basis. Different
          activities may rely on different bases, and no single basis applies to everything we do. Depending on the
          circumstances, these may include:
        </p>
        <ul>
          <li>your <strong>consent</strong>, for example when you subscribe to a newsletter;</li>
          <li>
            the <strong>performance of a contract or a service you have requested</strong>, for example handling a
            membership application or event registration;
          </li>
          <li>compliance with a <strong>legal obligation</strong>;</li>
          <li>
            our <strong>legitimate interests</strong>, such as keeping the website secure and administering the
            society, where these are not overridden by your rights and interests; and
          </li>
          <li>other lawful bases recognised by applicable law.</li>
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Data Subject Rights",
    body: (
      <>
        <p>Under Kenyan data protection law, and subject to the conditions and limitations it sets, you have the right to:</p>
        <Callout title="Your rights at a glance">
          <ul>
            <li>be informed of the use to which your personal data is being put;</li>
            <li>access your personal data held by us;</li>
            <li>request correction of inaccurate or incomplete personal data;</li>
            <li>request erasure or deletion of personal data where legally applicable;</li>
            <li>object to the processing of your personal data;</li>
            <li>request restriction of processing where applicable;</li>
            <li>receive your personal data in a portable format where applicable;</li>
            <li>withdraw your consent at any time where processing is based on consent; and</li>
            <li>lodge a complaint with the Office of the Data Protection Commissioner or another competent supervisory authority.</li>
          </ul>
        </Callout>
        <p>
          These rights are not absolute. Some are subject to lawful limitations, for example where we must retain
          information to meet a legal obligation or to establish, exercise or defend a legal claim. Withdrawing
          consent does not affect processing carried out lawfully before the withdrawal.
        </p>
      </>
    ),
  },
  {
    id: "exercise-rights",
    title: "How to Exercise Your Rights",
    body: (
      <>
        <p>
          To exercise any of your rights, or to ask a question about this notice, please contact YAS at <ContactLine />.
          YAS does not currently publish a separate dedicated privacy or data-protection mailbox, so these channels are
          the official means of contact.
        </p>
        <p>
          Requests will be handled in accordance with applicable law. We may ask for reasonable information to verify
          your identity before acting on a request, so that personal data is not disclosed to the wrong person.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Data Sharing and Disclosure",
    body: (
      <>
        <p>We do not sell personal data, and we do not disclose it casually. Where necessary and lawful, it may be shared with:</p>
        <ul>
          <li>authorised YAS office-bearers and personnel who need it to perform their roles;</li>
          <li>service providers and data processors that support the operation of the website;</li>
          <li>event or programme partners, where necessary and lawful;</li>
          <li>competent authorities, where we are legally required to do so; and</li>
          <li>other recipients, where you have given appropriate consent or another lawful basis exists.</li>
        </ul>
        <p>
          We expect third-party processors acting on our behalf to be subject to appropriate confidentiality and
          data-protection obligations.
        </p>
      </>
    ),
  },
  {
    id: "cross-border",
    title: "International and Cross-Border Transfers",
    body: (
      <p>
        The website relies on third-party hosting and database infrastructure, and some of these providers may process
        or store data on systems located outside Kenya. Where personal data is processed or transferred outside Kenya,
        YAS will seek to apply the safeguards and meet the legal requirements that apply under Kenyan data protection
        law. We do not state that all personal data is stored exclusively within Kenya.
      </p>
    ),
  },
  {
    id: "retention",
    title: "Data Retention",
    body: (
      <p>
        We keep personal data only for as long as is reasonably necessary for the purposes for which it was collected,
        taking into account legal obligations, legitimate institutional requirements, dispute resolution, security and
        record-keeping needs. When personal data is no longer needed, we aim to delete it or anonymise it. We have not
        set fixed retention periods for this website notice; if specific periods are adopted, they will be reflected
        here.
      </p>
    ),
  },
  {
    id: "security",
    title: "Data Security",
    body: (
      <>
        <p>
          We take the protection of personal data seriously and implement appropriate technical and organisational
          safeguards designed to protect personal information against unauthorised access, disclosure, alteration, loss
          or misuse.
        </p>
        <p>
          These measures include access controls, authentication for administrative areas, least-privilege principles
          so that personnel only access what they need, secure transmission of data where applicable, controlled
          administrative access, monitoring and maintenance, appropriate storage safeguards and incident response
          procedures.
        </p>
        <p>
          No method of transmission or storage can be guaranteed to be completely secure, and we cannot promise absolute
          security. We encourage you to share only the information that is needed.
        </p>
      </>
    ),
  },
  {
    id: "incidents",
    title: "Data Breaches and Security Incidents",
    body: (
      <p>
        If we suspect a personal-data incident, we will respond using appropriate internal procedures, take steps to
        contain and assess it, and comply with the notification and regulatory obligations that apply under Kenyan law,
        including notification to the ODPC and affected individuals where required.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and Similar Technologies",
    body: (
      <>
        <p>
          Cookies are small files stored on your device that help a website work. Similar technologies serve comparable
          purposes.
        </p>
        <p>
          <strong>Essential and functional technologies.</strong> The website may use cookies or similar technologies
          that are necessary for it to function, in particular to keep authorised administrators signed in securely.
          These are not used for advertising.
        </p>
        <p>
          <strong>Analytics and optional technologies.</strong> At the time of this notice, the website does not
          operate advertising or cross-site tracking cookies. If analytics or other optional technologies are
          introduced, this notice will be updated and, where required, your consent will be sought.
        </p>
        <p>
          You can control cookies through your browser settings, though disabling essential cookies may affect parts of
          the site. Fonts and similar resources may be loaded from third-party providers, which may receive technical
          information such as your IP address.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children\u2019s Data",
    body: (
      <p>
        The website is not intentionally designed to collect the personal data of children. Where children&rsquo;s
        personal data is processed for a lawful YAS activity, for example an outreach programme, appropriate safeguards
        will apply, including processing only where it is necessary and in the child&rsquo;s best interests, and
        obtaining consent from a parent or guardian where the law requires.
      </p>
    ),
  },
  {
    id: "third-party-links",
    title: "Third-Party Links",
    body: (
      <p>
        The website may link to external websites, including partner, social media or research sites. Those sites are
        governed by their own privacy practices, and we encourage you to read their policies. YAS is not responsible for
        how third parties handle personal data.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this Privacy Policy",
    body: (
      <>
        <p>
          YAS may update this notice from time to time to reflect changes in our practices or the law. The current
          version will always be published on this page, with the date it was last updated shown at the top.
        </p>
        <p>
          Our <Link href="/terms" className="font-semibold text-navy-deep underline decoration-gold underline-offset-4">Terms of Use</Link>{" "}
          also apply to your use of the website.
        </p>
        <p className="text-sm font-semibold text-navy-deep">Last updated: {LAST_UPDATED_PRIVACY}</p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Data Protection Notice"
      title="Privacy Policy"
      subtitle="How the Young Arbitrators Society handles personal data, in line with the Kenya Data Protection Act, 2019."
      lastUpdated={LAST_UPDATED_PRIVACY}
      trailLabel="Privacy Policy"
      sections={sections}
    />
  );
}
