import "server-only";
import type { Session } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/supabase";
import { stripMetadata, hasMetadata } from "@/lib/security/exif";

// Private media storage. References are stored as "media:<path>" and resolved
// to short-lived URLs only when needed.
//  - Supabase: private bucket "media", path "<userId>/<uuid>.<ext>", signed URLs (10 min)
//  - Demo: in-memory, served through an authenticated route

const MAX_BYTES = 8 * 1024 * 1024;
const g = globalThis as unknown as { __aosMedia?: Map<string, { userId: string; type: string; data: Uint8Array }> };
const demoMedia = (g.__aosMedia ??= new Map());

export async function putMedia(session: Session, file: Uint8Array): Promise<string> {
  if (file.byteLength > MAX_BYTES) throw new Error("Image is larger than 8 MB.");
  const { kind, data } = stripMetadata(file);
  if (hasMetadata(data)) throw new Error("Could not remove image metadata.");
  const type = `image/${kind}`;
  const ext = kind === "jpeg" ? "jpg" : kind;
  const path = `${session.userId}/${crypto.randomUUID()}.${ext}`;
  if (session.mode === "demo") {
    if (demoMedia.size > 2000) demoMedia.delete(demoMedia.keys().next().value!);
    demoMedia.set(path, { userId: session.userId, type, data });
  } else {
    const sb = await supabaseServer();
    const { error } = await sb.storage.from("media").upload(path, data, { contentType: type, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
  }
  return `media:${path}`;
}

function pathOf(ref: string, userId: string): string | null {
  if (!ref.startsWith("media:")) return null;
  const path = ref.slice(6);
  // Users can only ever resolve their own folder.
  if (!path.startsWith(`${userId}/`) || path.includes("..")) return null;
  return path;
}

export async function getMediaBytes(session: Session, ref: string): Promise<{ type: string; data: Uint8Array } | null> {
  const path = pathOf(ref, session.userId);
  if (!path) return null;
  if (session.mode === "demo") return demoMedia.get(path) ?? null;
  const sb = await supabaseServer();
  const { data, error } = await sb.storage.from("media").download(path);
  if (error || !data) return null;
  return { type: data.type, data: new Uint8Array(await data.arrayBuffer()) };
}

/** URL usable by the browser for previews. */
export async function mediaUrl(session: Session, ref?: string): Promise<string | undefined> {
  if (!ref) return undefined;
  if (!ref.startsWith("media:")) return ref.startsWith("/") || ref.startsWith("https://") ? ref : undefined;
  const path = pathOf(ref, session.userId);
  if (!path) return undefined;
  if (session.mode === "demo") return `/api/media?ref=${encodeURIComponent(ref)}`;
  const sb = await supabaseServer();
  const { data } = await sb.storage.from("media").createSignedUrl(path, 600);
  return data?.signedUrl;
}

/** Inline data URL, used for server-side rendering (satori) and exports. */
export async function mediaDataUrl(session: Session, ref?: string): Promise<string | undefined> {
  if (!ref) return undefined;
  const m = await getMediaBytes(session, ref);
  if (!m) return undefined;
  return `data:${m.type};base64,${Buffer.from(m.data).toString("base64")}`;
}

export async function listUserMedia(session: Session): Promise<string[]> {
  if (session.mode === "demo") return [...demoMedia.entries()].filter(([, v]) => v.userId === session.userId).map(([k]) => `media:${k}`);
  const sb = await supabaseServer();
  const { data } = await sb.storage.from("media").list(session.userId, { limit: 1000 });
  return (data ?? []).map((f) => `media:${session.userId}/${f.name}`);
}

export async function deleteAllMedia(session: Session, adminStorage?: { remove: (paths: string[]) => Promise<unknown> }) {
  if (session.mode === "demo") {
    for (const [k, v] of demoMedia) if (v.userId === session.userId) demoMedia.delete(k);
    return;
  }
  const refs = await listUserMedia(session);
  const paths = refs.map((r) => r.slice(6));
  if (paths.length && adminStorage) await adminStorage.remove(paths);
}
