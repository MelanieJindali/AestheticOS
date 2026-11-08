"use client";

import { useRef, useState } from "react";

/**
 * Re-encodes photos in the browser (canvas → JPEG) before upload, which drops
 * EXIF/GPS metadata at the source; the server strips metadata again.
 */
export async function reencode(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * s);
  canvas.height = Math.round(bmp.height * s);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.88));
}

export function ImageUpload({ label, onUploaded, hint }: { label: string; onUploaded: (ref: string, previewUrl: string) => void; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file?: File) {
    if (!file) return;
    setError(null);
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return setError("Please choose a JPEG, PNG or WebP photo.");
    setBusy(true);
    try {
      const blob = await reencode(file);
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onUploaded(json.ref, URL.createObjectURL(blob));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className="w-full rounded-2xl border border-dashed border-line bg-soft/50 px-4 min-h-14 text-sm hover:bg-soft">
        {busy ? "Cleaning & uploading…" : label}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" onChange={(e) => handle(e.target.files?.[0])} aria-label={label} />
      <p className="mt-1 text-xs text-muted">{hint ?? "Location and camera data are removed automatically."}</p>
      {error && <p className="mt-1 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}
