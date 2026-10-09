// Newsletter sign-up. Until an email provider / DB table exists this validates and
// acknowledges the request (logging only a hashed address). See docs/engineering/web.md.
import { createHash } from "node:crypto";

export async function POST(req: Request) {
  let body: { email?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }
  const hash = createHash("sha256").update(email).digest("hex").slice(0, 12);
  console.info(`[newsletter] signup ${hash} locale=${String(body.locale ?? "")}`);
  return Response.json({ ok: true }, { status: 202 });
}
