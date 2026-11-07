import type { Personality, VoiceGuide } from "@/lib/types";

const TONE: Record<Personality, string> = {
  warm: "warm and welcoming",
  expert: "knowledgeable and reassuring",
  playful: "playful and light",
  calm: "calm and unhurried",
  bold: "confident and direct",
  luxurious: "refined and indulgent",
  "down-to-earth": "honest and down-to-earth",
  inclusive: "inclusive and judgement-free",
};

const DOS: Record<Personality, string[]> = {
  warm: ["“Come as you are — we’ll take it from here.”", "“I can’t wait to see you in the chair.”"],
  expert: ["“Here’s why this works…”", "“Quick tip from 1,000+ appointments:”"],
  playful: ["“Lash day = best day.”", "“Tell me you need a refresh without telling me.”"],
  calm: ["“An hour that’s just for you.”", "“Breathe out. You’re in good hands.”"],
  bold: ["“Book it. You deserve it.”", "“No filter needed.”"],
  luxurious: ["“A ritual, not a rush.”", "“Every detail, considered.”"],
  "down-to-earth": ["“Real results, real skin.”", "“No fuss, just great work.”"],
  inclusive: ["“Every skin tone, every texture, every body.”", "“Your goals lead, I follow.”"],
};

const UNIVERSAL_DOS = [
  "“Results vary — let’s chat about what’s realistic for you.”",
  "“Link in bio to book.”",
  "“Ask me anything in the DMs.”",
  "“Aftercare matters — here’s how to make it last.”",
];

const UNIVERSAL_DONTS = [
  "“Guaranteed results” / “permanent results”",
  "“Cures / treats / heals” any condition",
  "“Pain-free” or “zero risk”",
  "“FDA-approved” (unless you can prove the exact device/product is)",
  "“Anti-ageing miracle” or “erase wrinkles”",
  "Body-shaming hooks (“fix your flaws”)",
  "“Doctor-recommended” without a named source",
  "Before/afters without written client consent",
  "Fake urgency (“only 1 spot left!” when it isn’t true)",
  "Comparing yourself negatively to named competitors",
];

export function buildVoice(personality: Personality[], signOffName?: string): VoiceGuide {
  const ps = personality.length ? personality : (["warm", "expert"] as Personality[]);
  const dos = [...ps.flatMap((p) => DOS[p]), ...UNIVERSAL_DOS].slice(0, 10);
  const playful = ps.includes("playful") || ps.includes("bold");
  const luxe = ps.includes("luxurious") || ps.includes("calm");
  return {
    tone: ps.map((p) => TONE[p]),
    dos,
    donts: UNIVERSAL_DONTS.slice(0, 10),
    signOff: signOffName ? `With love, ${signOffName}` : luxe ? "See you soon ✨" : "Talk soon!",
    emojiPolicy: playful ? "expressive" : luxe ? "minimal" : "minimal",
    favouriteEmojis: playful ? ["✨", "💖", "🔥", "👀"] : luxe ? ["✨", "🤍"] : ["✨", "🌿"],
  };
}
