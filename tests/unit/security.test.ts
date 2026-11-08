import { describe, expect, it, beforeAll } from "vitest";
import { hasMetadata, stripMetadata } from "@/lib/security/exif";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";
import { rateLimit, recordFailure, _resetRateLimits } from "@/lib/security/rate-limit";

function jpegWithExif(): Uint8Array {
  const exif = Buffer.concat([Buffer.from("Exif\0\0"), Buffer.from("GPS-LAT-51.5074-LON-0.1278")]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.from([(exif.length + 2) >> 8, (exif.length + 2) & 0xff]), exif]);
  const com = Buffer.concat([Buffer.from([0xff, 0xfe, 0x00, 0x07]), Buffer.from("hello")]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0x33, 0xff, 0xd9]);
  return new Uint8Array(Buffer.concat([Buffer.from([0xff, 0xd8]), app1, com, sos]));
}

function pngWithText(): Uint8Array {
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); return Buffer.concat([len, Buffer.from(type), data, Buffer.alloc(4)]); };
  return new Uint8Array(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", Buffer.alloc(13)), chunk("tEXt", Buffer.from("GPS\0secret")), chunk("eXIf", Buffer.from("exifdata")), chunk("IDAT", Buffer.from([1, 2, 3])), chunk("IEND", Buffer.alloc(0))]));
}

describe("image metadata stripping", () => {
  it("removes EXIF/GPS and comments from JPEG, keeps image data", () => {
    const src = jpegWithExif();
    expect(hasMetadata(src)).toBe(true);
    const { kind, data } = stripMetadata(src);
    expect(kind).toBe("jpeg");
    expect(hasMetadata(data)).toBe(false);
    expect(Buffer.from(data).toString("latin1")).not.toContain("GPS");
    expect(Buffer.from(data).includes(Buffer.from([0x11, 0x22, 0x33]))).toBe(true);
  });
  it("removes text and eXIf chunks from PNG", () => {
    const { data } = stripMetadata(pngWithText());
    const s = Buffer.from(data).toString("latin1");
    expect(s).not.toContain("tEXt");
    expect(s).not.toContain("eXIf");
    expect(s).toContain("IDAT");
  });
  it("rejects non-images", () => {
    expect(() => stripMetadata(new Uint8Array(Buffer.from("<svg onload=alert(1)>")))).toThrow();
  });
});

describe("token encryption", () => {
  beforeAll(() => { process.env.TOKEN_ENCRYPTION_KEYS = `k1:${Buffer.alloc(32, 7).toString("base64")}`; });
  it("round-trips and binds to the account id (AAD)", () => {
    const blob = encryptSecret("access-token-123", "acct-1");
    expect(blob).not.toContain("access-token");
    expect(decryptSecret(blob, "acct-1")).toBe("access-token-123");
    expect(() => decryptSecret(blob, "acct-2")).toThrow();
  });
  it("detects tampering", () => {
    const blob = encryptSecret("x", "a").split(".");
    blob[4] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(blob.join("."), "a")).toThrow();
  });
});

describe("rate limiting & lockout", () => {
  it("limits and locks out", () => {
    _resetRateLimits();
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, 0).ok).toBe(true);
    expect(rateLimit("k", 3, 1000, 1).ok).toBe(false);
    let locked = 0;
    for (let i = 0; i < 5; i++) locked = recordFailure("otp", 0).lockedForSec;
    expect(locked).toBeGreaterThan(0);
    expect(rateLimit("otp", 100, 1000, 10).ok).toBe(false);
  });
});
