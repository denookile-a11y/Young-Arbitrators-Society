import { NextResponse, type NextRequest } from "next/server";
import { unsubscribeSubscriber } from "@/lib/newsletter/service";
import { getUnsubscribeSecret, verifyUnsubscribe } from "@/lib/newsletter/tokens";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * RFC 8058 one-click unsubscribe target (List-Unsubscribe-Post). Mail
 * clients POST here without any session, so authorization is the signed
 * token alone. GET is intentionally not supported: link scanners issue GETs.
 */
export async function POST(request: NextRequest) {
  const secret = getUnsubscribeSecret();
  const id = request.nextUrl.searchParams.get("s") ?? "";
  const sig = request.nextUrl.searchParams.get("t") ?? "";
  if (!secret || !UUID.test(id) || !verifyUnsubscribe(id, sig, secret)) {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }
  const ok = await unsubscribeSubscriber(id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Try again" }, { status: 503 });
}
