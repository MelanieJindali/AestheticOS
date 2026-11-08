import { NextResponse, type NextRequest } from "next/server";
import { sessionForApi } from "@/lib/auth/session";
import { putMedia } from "@/lib/media";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";

export async function POST(req: NextRequest) {
  const ctx = await sessionForApi();
  if (!ctx) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!rateLimit(`upload:${ctx.session.userId}`, 60, 3_600_000).ok) return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 9 * 1024 * 1024) return NextResponse.json({ error: "Image is larger than 8 MB." }, { status: 413 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) return NextResponse.json({ error: "No file" }, { status: 400 });
    const ref = await putMedia(ctx.session, new Uint8Array(await file.arrayBuffer()));
    await audit(ctx.store, ctx.session.userId, "user", "media.uploaded", undefined, { bytes: file.size, metadataStripped: true });
    return NextResponse.json({ ref });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.includes("Unsupported") ? "Please use a JPEG, PNG or WebP image." : (e as Error).message.slice(0, 120) }, { status: 400 });
  }
}
