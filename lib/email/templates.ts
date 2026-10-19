/**
 * Email content. Everything visitor-supplied is treated as untrusted:
 * HTML-escaped in the HTML part, and stripped of control characters /
 * line breaks anywhere it lands in a header (subject, reply-to).
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Single-line, control-character-free, length-bounded text for headers. */
export function sanitizeSingleLine(value: string, max = 100): string {
  const cleaned = value.replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

function shell(inner: string): string {
  return `<div style="font-family:Georgia,serif;color:#0b1f3a;max-width:560px;margin:0 auto;padding:24px">${inner}<hr style="border:none;border-top:1px solid #e3e0d6;margin:28px 0 12px"><p style="font-size:12px;color:#6b7280;margin:0">Young Arbitrators Society — Kenyatta University School of Law</p></div>`;
}

export function renderContactEmail(input: {
  name: string;
  email: string;
  message: string;
  receivedAt: string;
}): RenderedEmail {
  const name = sanitizeSingleLine(input.name, 80);
  return {
    subject: `[YAS Contact] New message from ${name}`,
    text: `New contact form message\n\nName: ${name}\nEmail: ${input.email}\nReceived: ${input.receivedAt}\n\n${input.message}\n`,
    html: shell(
      `<h2 style="font-weight:normal">New contact form message</h2>` +
        `<p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(input.email)}<br><strong>Received:</strong> ${escapeHtml(input.receivedAt)}</p>` +
        `<p style="white-space:pre-wrap;border-left:3px solid #c9a24b;padding-left:14px">${escapeHtml(input.message)}</p>`
    ),
  };
}

export function renderNewsletterConfirmEmail(input: { confirmUrl: string; hoursValid: number }): RenderedEmail {
  return {
    subject: "Confirm your subscription to YAS updates",
    text: `Please confirm your subscription to Young Arbitrators Society announcements:\n\n${input.confirmUrl}\n\nThis link works once and expires in ${input.hoursValid} hours. If you did not request this, ignore this email and you will not be subscribed.\n`,
    html: shell(
      `<h2 style="font-weight:normal">Confirm your subscription</h2>` +
        `<p>Please confirm that you want to receive YAS announcements.</p>` +
        `<p><a href="${escapeHtml(input.confirmUrl)}" style="background:#0b1f3a;color:#fff;padding:12px 22px;text-decoration:none;display:inline-block">Confirm subscription</a></p>` +
        `<p style="font-size:13px;color:#6b7280">This link works once and expires in ${input.hoursValid} hours. If you did not request it, ignore this email and you will not be subscribed.</p>`
    ),
  };
}

export function renderAnnouncementEmail(input: {
  title: string;
  excerpt: string | null;
  url: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const title = sanitizeSingleLine(input.title, 140);
  const excerpt = input.excerpt ? input.excerpt.slice(0, 400) : "";
  return {
    subject: `YAS announcement: ${title}`,
    text: `${title}\n\n${excerpt}\n\nRead more: ${input.url}\n\nUnsubscribe: ${input.unsubscribeUrl}\n`,
    html: shell(
      `<h2 style="font-weight:normal">${escapeHtml(title)}</h2>` +
        (excerpt ? `<p style="white-space:pre-wrap">${escapeHtml(excerpt)}</p>` : "") +
        `<p><a href="${escapeHtml(input.url)}">Read the full announcement</a></p>` +
        `<p style="font-size:12px;color:#6b7280"><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#6b7280">Unsubscribe</a></p>`
    ),
  };
}
