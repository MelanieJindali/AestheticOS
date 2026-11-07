import type { MoodId, Palette, Personality } from "@/lib/types";

export interface Mood {
  id: MoodId;
  name: string;
  blurb: string;
  palette: Palette;
  texture: string;
  photoStyle: string;
  /** Swatches shown on the moodboard card. */
  swatches: string[];
  personalities: Personality[];
}

export const MOODS: Mood[] = [
  {
    id: "clean-clinical",
    name: "Clean Clinical",
    blurb: "Crisp whites, calm blues, quiet confidence.",
    palette: { primary: "#2f5d73", secondary: "#9cc3d0", accent: "#d9a46c", neutralLight: "#f7f9fa", neutralDark: "#17262e" },
    texture: "smooth matte, lots of white space",
    photoStyle: "bright, evenly lit, true-to-skin colour, neutral backgrounds",
    swatches: ["#f7f9fa", "#9cc3d0", "#2f5d73", "#d9a46c"],
    personalities: ["expert", "calm"],
  },
  {
    id: "soft-luxe",
    name: "Soft Luxe",
    blurb: "Blush, champagne and a whisper of gold.",
    palette: { primary: "#8a5a5f", secondary: "#e8cfc8", accent: "#c4a265", neutralLight: "#fbf6f3", neutralDark: "#2b1f20" },
    texture: "satin, silk, soft-focus glow",
    photoStyle: "warm natural light, soft shadows, close-up detail shots",
    swatches: ["#fbf6f3", "#e8cfc8", "#8a5a5f", "#c4a265"],
    personalities: ["luxurious", "warm"],
  },
  {
    id: "earthy-organic",
    name: "Earthy Organic",
    blurb: "Sage, clay and sun-warmed linen.",
    palette: { primary: "#5e6b4e", secondary: "#c9b79c", accent: "#b5653f", neutralLight: "#f6f2ea", neutralDark: "#2a2a22" },
    texture: "linen, paper grain, botanicals",
    photoStyle: "golden-hour light, plants and natural materials, relaxed framing",
    swatches: ["#f6f2ea", "#c9b79c", "#5e6b4e", "#b5653f"],
    personalities: ["down-to-earth", "calm", "warm"],
  },
  {
    id: "bold-editorial",
    name: "Bold Editorial",
    blurb: "High contrast, big type, magazine energy.",
    palette: { primary: "#111111", secondary: "#e9e4dc", accent: "#c8102e", neutralLight: "#ffffff", neutralDark: "#0a0a0a" },
    texture: "glossy print, strong grid",
    photoStyle: "dramatic lighting, tight crops, strong poses",
    swatches: ["#ffffff", "#e9e4dc", "#111111", "#c8102e"],
    personalities: ["bold", "expert"],
  },
  {
    id: "minimal-scandi",
    name: "Minimal Scandinavian",
    blurb: "Oat, stone and soft charcoal. Nothing extra.",
    palette: { primary: "#3d3d3a", secondary: "#d8d2c6", accent: "#8b9a8b", neutralLight: "#f4f1ec", neutralDark: "#1f1f1d" },
    texture: "light wood, stoneware, natural fibres",
    photoStyle: "soft daylight, muted tones, minimal props",
    swatches: ["#f4f1ec", "#d8d2c6", "#3d3d3a", "#8b9a8b"],
    personalities: ["calm", "expert"],
  },
  {
    id: "y2k-glam",
    name: "Y2K Glam",
    blurb: "Chrome, candy pink and sparkle.",
    palette: { primary: "#d6247f", secondary: "#f7c6e0", accent: "#7b61ff", neutralLight: "#fff5fb", neutralDark: "#26061a" },
    texture: "chrome, glitter, glossy gradients",
    photoStyle: "flash photography, bold colour, playful angles",
    swatches: ["#fff5fb", "#f7c6e0", "#d6247f", "#7b61ff"],
    personalities: ["playful", "bold"],
  },
];

export function moodById(id: MoodId): Mood {
  return MOODS.find((m) => m.id === id) ?? MOODS[0];
}
