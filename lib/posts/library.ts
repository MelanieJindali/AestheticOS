// The built-in (free, offline, deterministic) content library used when no LLM
// key is configured, and as a safe fallback if the LLM is unavailable.
// Placeholders: {service} {niche} {city} {client} {business} {duration} {price}
// {signoff} {cta} {e} (emoji, respects emoji policy) {season} {topic}

import type { Pillar, TemplateType } from "@/lib/types";

export interface Frame {
  hook: string;
  body: string;
  slots: { headline: string; subhead?: string; body?: string; items?: string[]; cta?: string; footer?: string };
}

export const PILLAR_TEMPLATES: Record<Pillar, TemplateType[]> = {
  education: ["tip", "faq", "tip"],
  transformation: ["before-after", "service-spotlight"],
  "behind-the-scenes": ["meet-the-artist", "product", "service-spotlight"],
  testimonials: ["testimonial"],
  offers: ["promo", "availability", "seasonal"],
  "personal-story": ["meet-the-artist"],
};

export const FRAMES: Record<TemplateType, Frame[]> = {
  tip: [
    {
      hook: "{e}Want your {service} to last longer? Save this.",
      body: "The first 24 hours matter most. Keep it dry, skip steam and heavy creams, and brush gently every morning. Small habits = longer-lasting results.",
      slots: { headline: "Make your {service} last longer", subhead: "Aftercare 101", items: ["Keep dry for 24 hours", "Skip steam & oils", "Brush gently daily"], cta: "Save for later" },
    },
    {
      hook: "{e}Myth: you can't get {service} if you have sensitive skin.",
      body: "Truth: a consultation and patch test help us find the right products for you. Everyone's different, so let's chat about what's right for you.",
      slots: { headline: "Myth vs. truth", subhead: "Myth-buster", body: "Sensitive skin? A patch test and the right products make all the difference.", cta: "Ask me in the DMs" },
    },
    {
      hook: "{e}3 things I wish every client knew before their {service}",
      body: "1. Arrive with clean, product-free skin.\n2. Tell me about anything that might affect your treatment. It stays between us.\n3. Ask questions! There's no such thing as a silly one.",
      slots: { headline: "3 things to know before your {service}", subhead: "Prep guide", items: ["Arrive product-free", "Share anything relevant (privately)", "Ask all the questions"] },
    },
  ],
  faq: [
    {
      hook: "{e}“How long does {service} take?” I hear this every week!",
      body: "Around {duration} minutes, and that includes a quick consultation so we're on the same page. Bring a podcast, or just relax.",
      slots: { headline: "How long does {service} take?", subhead: "You asked", body: "About {duration} minutes, including a mini consultation. Bring a podcast or have a nap.", cta: "More FAQs in highlights" },
    },
    {
      hook: "{e}“Does it hurt?” Let's talk honestly.",
      body: "Most clients find {service} very comfortable, and some even fall asleep. Everyone is different, so we can pause at any time.",
      slots: { headline: "Does {service} hurt?", subhead: "Honest answers", body: "Most clients find it very comfortable. We go at your pace and can pause any time." },
    },
  ],
  "before-after": [
    {
      hook: "{e}The {service} glow-up. Swipe to see the difference.",
      body: "Tailored to their features and lifestyle. Results vary from person to person. These photos are unedited and shared with my client's written permission.",
      slots: { headline: "{service}", subhead: "Before & after", footer: "Results vary. Unedited photos, shared with client permission." },
    },
  ],
  "service-spotlight": [
    {
      hook: "{e}Meet {service}: made for {client}.",
      body: "{duration} minutes, fully personalised, starting at {price}. We start with a consultation so your result suits you, not a trend.",
      slots: { headline: "{service}", subhead: "Service spotlight", body: "Personalised to you. Starts with a consultation.", items: ["{duration} min", "From {price}", "{city}"], cta: "Book now" },
    },
    {
      hook: "{e}Not sure which service is right for you? Start here.",
      body: "{service} is my go-to for {client} who want something low-maintenance that still feels special. Book a consultation and we'll decide together.",
      slots: { headline: "Is {service} right for you?", subhead: "Guide", items: ["Low maintenance", "Tailored to you", "Consultation included"], cta: "Book a consultation" },
    },
  ],
  testimonial: [
    {
      hook: "{e}Words like these are why I do what I do.",
      body: "Thank you for trusting me! (Shared with permission.) If you've visited recently, I'd love to hear how you're getting on. Reviews help small businesses like mine so much.",
      slots: { headline: "I've never felt so looked after. I'll be back every month!", subhead: "— Verified client, shared with permission", cta: "Book your visit" },
    },
    {
      hook: "{e}Kind words from the chair this week",
      body: "Shared with permission. Every review helps another person find a studio they can trust, so thank you!",
      slots: { headline: "Calm, careful and so talented. My new favourite place.", subhead: "— Client review", cta: "Read more reviews" },
    },
  ],
  promo: [
    {
      hook: "{e}New here? Enjoy {topic} off your first {service}.",
      body: "New clients can enjoy {topic} off their first {service} this month. Terms below, and spaces are limited by my real diary, not a countdown timer.",
      slots: { headline: "{topic} off your first {service}", subhead: "New client offer", body: "Valid this month for first visits.", cta: "Claim via link in bio", footer: "New clients only. One per person. Subject to availability." },
    },
  ],
  availability: [
    {
      hook: "{e}A few spots just opened up this week!",
      body: "If you've been meaning to book your {service}, now's your chance. Tap the link in bio to grab a time that suits you.",
      slots: { headline: "Open spots this week", subhead: "Availability", cta: "Book via link in bio" },
    },
  ],
  seasonal: [
    {
      hook: "{e}{season} is coming. Is your glow ready?",
      body: "Book your {service} 1–2 weeks before the big day so everything is settled, natural and camera-ready. Spots go quickly around {season}.",
      slots: { headline: "{season} glow season", subhead: "Plan ahead", body: "Book 1–2 weeks before your event.", cta: "Reserve your spot" },
    },
  ],
  "meet-the-artist": [
    {
      hook: "{e}Hi, I'm the hands behind {business}!",
      body: "I started {business} because I believe {client} deserve to feel calm, cared for and confident. When I'm not working I'm probably drinking too much coffee and reorganising my product shelf. Say hi below!",
      slots: { headline: "Hi, I'm the hands behind {business}", subhead: "Meet the artist", body: "Calm, careful and obsessed with the details." },
    },
    {
      hook: "{e}Why I do this (a little story)",
      body: "Years ago I had an appointment that left me feeling rushed and unheard. I promised myself that if I ever opened a studio, every client would feel the opposite. That's {business}.",
      slots: { headline: "Why I started {business}", subhead: "My story", body: "Every client should feel heard, never rushed." },
    },
  ],
  product: [
    {
      hook: "{e}The aftercare product I recommend most (not sponsored)",
      body: "I recommend this to almost everyone after their {service}. It's gentle, simple and easy to use. Not sponsored, I just like it! Patch test new products first.",
      slots: { headline: "My aftercare must-have", subhead: "What I actually use", body: "Gentle, simple and easy to use.", footer: "Not sponsored. Patch test new products." },
    },
  ],
};

export const SEASONS: { month: number; day: number; name: string; regions?: string[] }[] = [
  { month: 1, day: 1, name: "New Year" },
  { month: 2, day: 14, name: "Valentine's Day" },
  { month: 3, day: 8, name: "International Women's Day" },
  { month: 3, day: 15, name: "Mother's Day", regions: ["UK"] },
  { month: 5, day: 10, name: "Mother's Day", regions: ["US", "CA", "AU", "NZ"] },
  { month: 5, day: 25, name: "Wedding season" },
  { month: 6, day: 21, name: "Summer" },
  { month: 9, day: 1, name: "Back to routine" },
  { month: 10, day: 31, name: "Halloween" },
  { month: 11, day: 27, name: "Black Friday" },
  { month: 12, day: 1, name: "Party season" },
  { month: 12, day: 25, name: "The holidays" },
];

export function upcomingSeason(from: Date, region: string, withinDays = 45): string | null {
  for (let add = 0; add <= withinDays; add++) {
    const d = new Date(from.getTime() + add * 86_400_000);
    const s = SEASONS.find((x) => x.month === d.getUTCMonth() + 1 && x.day === d.getUTCDate() && (!x.regions || x.regions.includes(region)));
    if (s) return s.name;
  }
  return null;
}

export const IDEA_BANK: Record<Pillar, string[]> = {
  education: [
    "Aftercare mistakes that shorten your {service} results",
    "Myth vs. fact: {service} edition",
    "What happens during a {service} appointment, step by step",
    "How to choose the right {service} for your lifestyle",
    "The ingredient or tool I'd never skip, and why",
    "How often should you book {service}? An honest answer",
  ],
  transformation: [
    "Before/after of a natural {service} (with consent)",
    "Timelapse: a full {service} in 30 seconds",
    "Same client, 3 visits: how results build over time (with consent)",
    "Detail close-up: the precision behind {service}",
  ],
  "behind-the-scenes": [
    "Setting up the studio before the first client",
    "My sanitation routine between every client",
    "What's in my kit (and why each thing matters)",
    "A day in the life of a {niche}",
    "Unboxing new tools or products",
  ],
  testimonials: [
    "Share a review you're proud of (with permission)",
    "Ask clients: “What would you tell a friend about us?”",
    "Screenshot of a lovely message (no names, with permission)",
    "Your Google review milestone thank-you",
  ],
  offers: [
    "Fill this week's gaps with an availability post",
    "Bundle: {service} + aftercare kit",
    "Refer-a-friend: you both get a little treat",
    "Rebooking reward: book your next visit before you leave",
    "Seasonal offer for {season}",
  ],
  "personal-story": [
    "Why I started {business}",
    "A mistake I made early on and what it taught me",
    "My non-negotiables as a {niche}",
    "Where I trained and what I'm learning next",
    "The client moment that made me cry happy tears (no details)",
  ],
};
