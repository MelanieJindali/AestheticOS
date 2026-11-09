# Aesthetic OS — notes for Claude sessions

## Design system: Celestial Garden
Soft moonlight meets a botanical garden: lighter, cozy, professional and elegant, never whimsical. Every UI colour, font, radius and motion value comes from the tokens in `app/globals.css`; never hard-code hex values in components. User brand palettes appear only inside their templates, posts and brand kit, never in the app UI.

**Dawn (default).** moonlit-cream #FAF6F0 (background) · petal-blush #F3E2DC (warm cards) · dawn-mist #ECEEF3 (cool cards, Muse bubbles) · lilac-haze #DCD5E8 (dreamy accents) · meadow-sage #A9BCA3 (botanical line art) · honey-gold #D6B37A (glow, stars, fireflies, rings; decor only) · fern #4E6249 (primary buttons, links, active, emphasis) · gilded-bronze #85663A (small labels) · bark #6B6058 (secondary text) · cocoa #3A322C (text) · terracotta #A3543F (errors).
**Twilight (dark mode).** dusk-plum #3A3548 ground, #48425A raised, #FAF6F0 text, #D9D3E4 secondary, honey-gold buttons with cocoa text and honey-gold emphasis.
Tailwind roles: `bg`, `surface`, `soft`, `cool`, `lilac`, `ink`, `muted`, `line`, `primary`, `on-primary`, `emphasis`, `accent`, `bronze`, `calm`, `warm`, `danger`, `track`.

**Type.** Cormorant Garamond 500 headings with one italic emphasis word (`<em>`, fern/honey-gold); Jost 300–500 UI, 15px minimum; `.eyebrow` uppercase 12px with 2.5px tracking.

**Surfaces and motifs.** `.glass` cards (translucent cream, 24px radius, soft warm shadow) over watercolor light washes and ≤3% paper grain. `ITEM` list rows, pill buttons and inputs (min 44px). Brand pieces in `components/garden.tsx`: `Logo`/`LogoSymbol` (crescent moon cradling a leaf, guiding star), `Fireflies` (6–10 max, one cluster per screen), `Sprig` (botanical corner, sways ±2°), `MoonLoader`, `Constellation` (weekly progress; done tasks bloom into flowers). `.arch` frames. Icons: `components/icons.tsx` (1.5px outline); no emoji.

**Motion.** Tokens `--ease-bloom` (entrances), `--ease-settle` (≤3% overshoot), `--ease-drift` (ambient); 120ms tap, 280ms UI, 700ms reveal, 8–14s ambient, 60ms stagger (`.rise`, `.stagger`, `.press`, `.halo`, `.bloom`, `.draw`, `.nudge`). Animate only transform/opacity; every animation has a still fallback under prefers-reduced-motion; errors nudge 2px, never shake.

**Voice.** Warm, calm, clear, like a trusted mentor. Short sentences, encouraging, never pushy; no urgency tricks or shaming. Show "Private to you" (`PrivateNote`) where data is entered.

## Engineering rules
- Business rules live in `lib/services/*` (shared by demo and Supabase modes); actions in `app/actions/*` stay thin (validate → service → audit → revalidate).
- Every LLM call goes through `lib/ai/gateway.ts` (redaction is mandatory).
- Schema changes are new files in `supabase/migrations/`; keep `npm run test:db` green.
- Before pushing: `npm run typecheck && npm test && npm run test:e2e`.
