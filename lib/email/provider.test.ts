import { describe, expect, it, vi } from "vitest";
import { createResendSender, hasHeaderInjection, isEmailConfigured } from "./provider";

const env = { RESEND_API_KEY: "re_secret_key_value", EMAIL_FROM: "YAS <noreply@example.org>" } as unknown as NodeJS.ProcessEnv;
const msg = { to: "inbox@example.org", subject: "Hello", text: "Body", idempotencyKey: "outbox-1" };

function fetchReturning(status: number, body: unknown = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("email provider (mocked fetch — no real delivery)", () => {
  it("is configured only when both key and sender exist", () => {
    expect(isEmailConfigured(env)).toBe(true);
    expect(isEmailConfigured({ ...env, RESEND_API_KEY: "" } as NodeJS.ProcessEnv)).toBe(false);
    expect(isEmailConfigured({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it("sends to the given recipient with the idempotency key and returns the provider id", async () => {
    const fetchMock = fetchReturning(200, { id: "prov_123" });
    const result = await createResendSender(env, fetchMock as unknown as typeof fetch)({ ...msg, replyTo: "visitor@example.com" });
    expect(result).toEqual({ ok: true, id: "prov_123" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("outbox-1");
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(["inbox@example.org"]);
    expect(body.reply_to).toBe("visitor@example.com");
  });

  it("marks 5xx and 429 retryable, other 4xx permanent, network errors retryable", async () => {
    const send = (f: unknown) => createResendSender(env, f as typeof fetch)(msg);
    expect(await send(fetchReturning(503))).toMatchObject({ ok: false, retryable: true });
    expect(await send(fetchReturning(429))).toMatchObject({ ok: false, retryable: true });
    expect(await send(fetchReturning(422))).toMatchObject({ ok: false, retryable: false });
    expect(await send(vi.fn(async () => { throw new Error("boom"); }))).toMatchObject({ ok: false, retryable: true });
  });

  it("never leaks the API key or the message body in an error", async () => {
    const result = await createResendSender(env, fetchReturning(500) as unknown as typeof fetch)({ ...msg, text: "SECRET BODY" });
    expect(JSON.stringify(result)).not.toContain("re_secret_key_value");
    expect(JSON.stringify(result)).not.toContain("SECRET BODY");
  });

  it("refuses header injection in subject, recipient, reply-to and custom headers without calling the provider", async () => {
    const fetchMock = fetchReturning(200);
    const send = createResendSender(env, fetchMock as unknown as typeof fetch);
    for (const bad of [
      { ...msg, subject: "Hi\r\nBcc: attacker@evil.test" },
      { ...msg, to: "a@b.test\nBcc: x@y.test" },
      { ...msg, replyTo: "v@x.test\r\nX: y" },
      { ...msg, headers: { "X-A": "ok\r\nBcc: z@z.test" } },
    ]) {
      expect(await send(bad)).toMatchObject({ ok: false, retryable: false });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(hasHeaderInjection("clean value")).toBe(false);
  });

  it("returns a permanent failure when unconfigured instead of pretending to send", async () => {
    const result = await createResendSender({} as NodeJS.ProcessEnv, vi.fn() as unknown as typeof fetch)(msg);
    expect(result).toMatchObject({ ok: false, retryable: false });
  });
});

describe("provider timeout", () => {
  it("passes an abort signal so a hung provider cannot hang the caller", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    await createResendSender(env, fetchMock as unknown as typeof fetch)(msg);
    const init = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init[1].signal).toBeInstanceOf(AbortSignal);
  });
  it("a real timeout is reported as retryable and ambiguous (retried under the same idempotency key)", async () => {
    const hang = (_url: string, init?: RequestInit) => new Promise<Response>((_res, rej) => init!.signal!.addEventListener("abort", () => rej(init!.signal!.reason)));
    const result = await createResendSender(env, hang as unknown as typeof fetch, 20)(msg);
    expect(result).toMatchObject({ ok: false, retryable: true });
    expect((result as { error: string }).error).toMatch(/timed out/);
  });
});
