import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// AES-256-GCM envelope for OAuth tokens and other secrets stored in the DB.
// Format: v1.<keyId>.<iv b64url>.<tag b64url>.<ciphertext b64url>
// Keys come from TOKEN_ENCRYPTION_KEYS="keyId:base64key,keyId2:base64key" — the
// first key encrypts, all keys decrypt, so keys can be rotated.

function keys(): { id: string; key: Buffer }[] {
  const raw = process.env.TOKEN_ENCRYPTION_KEYS ?? "";
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean).map((pair) => {
    const [id, b64] = pair.split(":");
    const key = Buffer.from(b64 ?? "", "base64");
    if (!id || key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEYS entries must be keyId:<32-byte base64>");
    return { id, key };
  });
  if (!list.length) {
    // Demo sandbox only: derive a throwaway key so the connect/revoke flow can be exercised.
    const demo = process.env.DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (demo) return [{ id: "demo", key: createHash("sha256").update(`demo-token-key:${process.env.SESSION_SECRET ?? ""}`).digest() }];
    throw new Error("TOKEN_ENCRYPTION_KEYS is not set");
  }
  return list;
}

export function encryptSecret(plain: string, aad = ""): string {
  const { id, key } = keys()[0];
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", id, iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptSecret(blob: string, aad = ""): string {
  const [v, id, iv, tag, ct] = blob.split(".");
  if (v !== "v1") throw new Error("Unknown secret format");
  const k = keys().find((x) => x.id === id);
  if (!k) throw new Error("Unknown encryption key id");
  const d = createDecipheriv("aes-256-gcm", k.key, Buffer.from(iv, "base64url"));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function hmac(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
