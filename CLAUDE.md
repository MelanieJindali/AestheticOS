# Aesthetic OS — notes for Claude sessions

## Design system: Calm Luxe
Friendly high-class, zen, trustworthy, never clinical. Every UI colour, font and radius comes from the tokens in `app/globals.css`; never hard-code hex values in components. User brand palettes appear only inside their templates, posts and brand kit, never in the app UI.

**Colours.** pearl #FBF8F4 (background) · linen #F2EBE2 (cards, soft surfaces, Muse bubbles) · blush-clay #EAD7CC (placeholders, warm highlights) · sage-mist #A8B5A2 (decorative only) · deep-sage #56664F (primary buttons, links, active nav, user bubbles) · champagne #C2A27A (borders, rings, dividers; never small text) · bronze #8A6A44 (small accent labels) · espresso #2F2A26 (text) · taupe #6E645C (secondary text) · hairline #ECE3D8 · white surfaces · terracotta #A3543F (errors). Dark mode uses espresso grounds, #3A342F raised surfaces and linen text.
Tailwind roles: `bg`, `surface`, `soft`, `ink`, `muted`, `line`, `primary`, `on-primary`, `accent`, `bronze`, `danger`, `warm`, `calm`, `track`.

**Type.** Headings Cormorant Garamond 500 (one italic emphasis word via `<em>`, shown in deep sage). Body and UI Jost 300–500, 15px minimum, line-height 1.5. Eyebrows: `.eyebrow` (12px, uppercase, 2px tracking, taupe). Scale 12/14/15/18/22/28/34/44.

**Shape and space.** Cards 24px radius, linen, no shadow. List items 18px, white, hairline border (`ITEM` in `components/ui.tsx`). Inputs 28px (multi-line 18px). Buttons are pills, min height 44px. Signature motif: `.arch` frames. 8px spacing, 24px screen padding. Depth from surfaces and hairlines, not shadows. Icons: `components/icons.tsx` (1.5px outline); no emoji in the UI.

**Motion.** 200–300ms ease-out (`.rise`, `--ease-calm`), soft `.shimmer` for loading; always respect prefers-reduced-motion.

**Voice.** Warm, calm, clear, like a trusted mentor. Short sentences, encouraging, never pushy; no urgency tricks or shaming. Show "Private to you" (`PrivateNote`) where data is entered.

## Engineering rules
- Business rules live in `lib/services/*` (shared by demo and Supabase modes); actions in `app/actions/*` stay thin (validate → service → audit → revalidate).
- Every LLM call goes through `lib/ai/gateway.ts` (redaction is mandatory).
- Schema changes are new files in `supabase/migrations/`; keep `npm run test:db` green.
- Before pushing: `npm run typecheck && npm test && npm run test:e2e`.
