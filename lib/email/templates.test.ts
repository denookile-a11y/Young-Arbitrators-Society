import { describe, expect, it } from "vitest";
import { escapeHtml, renderAnnouncementEmail, renderContactEmail, renderNewsletterConfirmEmail, sanitizeSingleLine } from "./templates";

describe("email templates treat visitor content as untrusted", () => {
  it("escapes HTML", () => {
    expect(escapeHtml(`<script>alert("x")</script>&'`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;");
  });

  it("strips line breaks and control characters from single-line values", () => {
    expect(sanitizeSingleLine("Jo\r\nBcc: evil@x.test\u0000")).not.toMatch(/[\r\n\u0000]/);
    expect(sanitizeSingleLine("x".repeat(500), 50).length).toBeLessThanOrEqual(50);
  });

  it("contact email: subject has no line break even for a hostile name; html escapes the message", () => {
    const mail = renderContactEmail({ name: "Eve\r\nBcc: a@b.test", email: "e@x.test", message: "<img src=x onerror=alert(1)>", receivedAt: "2026-01-01T00:00:00Z" });
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
  });

  it("confirmation email carries the link and an expiry notice", () => {
    const mail = renderNewsletterConfirmEmail({ confirmUrl: "https://yas.test/newsletter/confirm?token=abc", hoursValid: 48 });
    expect(mail.text).toContain("https://yas.test/newsletter/confirm?token=abc");
    expect(mail.text).toContain("48 hours");
  });

  it("announcement email always includes an unsubscribe link and escapes the title", () => {
    const mail = renderAnnouncementEmail({ title: "<b>Hi</b>", excerpt: null, url: "https://yas.test/a", unsubscribeUrl: "https://yas.test/u" });
    expect(mail.text).toContain("https://yas.test/u");
    expect(mail.html).toContain("https://yas.test/u");
    expect(mail.html).not.toContain("<b>Hi</b>");
  });
});
