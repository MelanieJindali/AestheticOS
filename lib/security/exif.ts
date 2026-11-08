// Strip metadata (EXIF incl. GPS, XMP, IPTC, comments, ICC-embedded text) from
// JPEG, PNG and WebP uploads without re-encoding. Pure TS, runs on server and
// in tests. The browser additionally re-encodes via canvas before upload.

export type ImageKind = "jpeg" | "png" | "webp";

export function sniffImage(buf: Uint8Array): ImageKind | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") return "webp";
  return null;
}

function ascii(b: Uint8Array, o: number, n: number) {
  return String.fromCharCode(...b.subarray(o, o + n));
}

export function stripMetadata(buf: Uint8Array): { kind: ImageKind; data: Uint8Array } {
  const kind = sniffImage(buf);
  if (kind === "jpeg") return { kind, data: stripJpeg(buf) };
  if (kind === "png") return { kind, data: stripPng(buf) };
  if (kind === "webp") return { kind, data: stripWebp(buf) };
  throw new Error("Unsupported image type. Use JPEG, PNG or WebP.");
}

function stripJpeg(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) throw new Error("Corrupt JPEG");
    const marker = b[i + 1];
    if (marker === 0xd9) { out.push(b.subarray(i, i + 2)); break; }
    if (marker === 0xda) { out.push(b.subarray(i)); break; } // start of scan: rest is image data
    if (marker >= 0xd0 && marker <= 0xd7) { out.push(b.subarray(i, i + 2)); i += 2; continue; }
    const len = (b[i + 2] << 8) | b[i + 3];
    const seg = b.subarray(i, i + 2 + len);
    // Drop APP1 (EXIF/XMP), APP2-APP15 except ICC (APP2 "ICC_PROFILE") and Adobe (APP14), and COM.
    const isApp = marker >= 0xe1 && marker <= 0xef;
    const isIcc = marker === 0xe2 && ascii(seg, 4, 11) === "ICC_PROFILE";
    const isAdobe = marker === 0xee;
    if (!(isApp && !isIcc && !isAdobe) && marker !== 0xfe) out.push(seg);
    i += 2 + len;
  }
  return concat(out);
}

const PNG_DROP = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME", "dSIG"]);

function stripPng(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i < b.length) {
    const len = ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
    const type = ascii(b, i + 4, 4);
    const total = 12 + len;
    if (!PNG_DROP.has(type)) out.push(b.subarray(i, i + total));
    i += total;
    if (type === "IEND") break;
  }
  return concat(out);
}

function stripWebp(b: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let i = 12;
  let vp8x: Uint8Array | null = null;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const len = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24);
    const total = 8 + len + (len & 1);
    const chunk = b.slice(i, i + total);
    if (type === "VP8X") vp8x = chunk;
    else if (type !== "EXIF" && type !== "XMP ") chunks.push(chunk);
    i += total;
  }
  if (vp8x) {
    vp8x[8] &= ~(0x08 | 0x04); // clear EXIF and XMP flags
    chunks.unshift(vp8x);
  }
  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set([0x52, 0x49, 0x46, 0x46]);
  const size = body.length + 4;
  header[4] = size & 0xff; header[5] = (size >> 8) & 0xff; header[6] = (size >> 16) & 0xff; header[7] = (size >> 24) & 0xff;
  header.set([0x57, 0x45, 0x42, 0x50], 8);
  return concat([header, body]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** True if any known metadata container remains (used by tests and as a server-side assertion). */
export function hasMetadata(buf: Uint8Array): boolean {
  const kind = sniffImage(buf);
  const s = Buffer.from(buf).toString("latin1");
  if (kind === "jpeg") return s.includes("Exif\u0000\u0000") || s.includes("http://ns.adobe.com/xap/");
  if (kind === "png") return ["tEXt", "zTXt", "iTXt", "eXIf"].some((t) => s.includes(t));
  if (kind === "webp") return s.includes("EXIF") || s.includes("XMP ");
  return false;
}
