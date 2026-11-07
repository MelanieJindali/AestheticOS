// Palette extraction from inspiration images. Runs in the browser on raw pixel
// data, so inspiration photos never leave the user's device (data minimisation).

import { colorDistance, hexToHsl, rgbToHex, type RGB } from "./color";

/** Deterministic k-means on RGBA pixel data. Returns hex colours sorted by weight. */
export function extractPalette(data: Uint8ClampedArray | number[], k = 6, maxSamples = 4000): string[] {
  const px: RGB[] = [];
  const total = Math.floor(data.length / 4);
  const step = Math.max(1, Math.floor(total / maxSamples));
  for (let i = 0; i < total; i += step) {
    const o = i * 4;
    if (data[o + 3] < 128) continue; // skip transparent
    px.push({ r: data[o], g: data[o + 1], b: data[o + 2] });
  }
  if (px.length === 0) return [];
  k = Math.min(k, px.length);

  // k-means++-ish deterministic seeding: start with the first pixel, then
  // repeatedly pick the pixel furthest from existing centres.
  const centres: RGB[] = [px[0]];
  while (centres.length < k) {
    let best = px[0], bestD = -1;
    for (const p of px) {
      const d = Math.min(...centres.map((c) => dist(p, c)));
      if (d > bestD) { bestD = d; best = p; }
    }
    centres.push({ ...best });
  }

  const counts = new Array(k).fill(0);
  for (let iter = 0; iter < 12; iter++) {
    const sums = centres.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (const p of px) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < centres.length; c++) {
        const d = dist(p, centres[c]);
        if (d < bd) { bd = d; bi = c; }
      }
      const s = sums[bi]; s.r += p.r; s.g += p.g; s.b += p.b; s.n++;
    }
    sums.forEach((s, i) => {
      counts[i] = s.n;
      if (s.n) centres[i] = { r: s.r / s.n, g: s.g / s.n, b: s.b / s.n };
    });
  }

  return centres
    .map((c, i) => ({ hex: rgbToHex(c), n: counts[i] }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((c) => c.hex);
}

function dist(a: RGB, b: RGB) {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/** Merge colours from several images, dropping near-duplicates. */
export function mergePalettes(palettes: string[][], max = 8): string[] {
  const out: string[] = [];
  const flat = palettes.flatMap((p, i) => p.map((hex, rank) => ({ hex, rank: rank + i * 0.01 })));
  flat.sort((a, b) => a.rank - b.rank);
  for (const { hex } of flat) {
    if (out.every((o) => colorDistance(o, hex) > 60)) out.push(hex);
    if (out.length >= max) break;
  }
  return out;
}

/** Light-weight classification used to turn extracted colours into a Palette. */
export function describeColor(hex: string) {
  const { s, l } = hexToHsl(hex);
  return { isNeutral: s < 15, isLight: l > 80, isDark: l < 22, saturation: s, lightness: l };
}
