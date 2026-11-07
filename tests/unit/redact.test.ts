import { describe, expect, it } from "vitest";
import { redact, redactDeep } from "@/lib/ai/redact";

// Each case: input + the PII fragments that must NOT survive.
const CASES: [string, string[]][] = [
  ["Email me at sarah.jones@gmail.com to confirm", ["sarah.jones@gmail.com"]],
  ["Call 07700 900123 or +44 7700 900123", ["07700 900123", "+44 7700 900123", "900123"]],
  ["US line (415) 555-0134 or 415-555-0134 or 4155550134", ["555-0134", "4155550134"]],
  ["Text +1 212 555 0199 anytime", ["555 0199"]],
  ["She lives at 42 Maple Street, Apt 5B", ["42 Maple Street", "Apt 5B"]],
  ["Studio moved to 221B Baker Street, NW1 6XE", ["Baker Street", "NW1 6XE"]],
  ["Canadian client in M5V 2T6", ["M5V 2T6"]],
  ["DOB: 14/03/1991, booked again", ["14/03/1991"]],
  ["born on March 3rd 1988 — loves volume sets", ["March 3rd 1988"]],
  ["Appointment on 2026-11-12 was great", ["2026-11-12"]],
  ["my client Sarah loved her hybrid set", ["Sarah"]],
  ["customer Priya K. had a reaction", ["Priya"]],
  ["Mrs Patel came for brows", ["Patel"]],
  ["Jessica's lashes turned out amazing", ["Jessica"]],
  ["Thank you Amelia for trusting me!", ["Amelia"]],
  ["Emma came in with eczema and rosacea", ["Emma", "eczema", "rosacea"]],
  ["client is pregnant and diabetic, on blood thinners", ["pregnant", "diabetic", "blood thinners"]],
  ["She's on Accutane so no peel", ["Accutane"]],
  ["She has alopecia after chemo", ["alopecia", "chemo"]],
  ["Tagging @jess.lashlover in the reel", ["@jess.lashlover"]],
  ["Card 4111 1111 1111 1111 for deposit", ["4111 1111 1111 1111"]],
  ["SSN 123-45-6789", ["123-45-6789"]],
  ["NI number QQ 12 34 56 C", ["QQ 12 34 56 C"]],
  ["Her booking link https://book.example.com/confirm?client=jane&phone=123", ["client=jane"]],
  ["Client aged 34 with anxiety disorder", ["aged 34", "anxiety disorder"]],
  ["She is 52 years old and going through menopause", ["52 years old", "menopause"]],
];

describe("redact()", () => {
  it.each(CASES)("removes PII from: %s", (input, forbidden) => {
    const out = redact(input).text;
    for (const f of forbidden) expect(out.toLowerCase()).not.toContain(f.toLowerCase());
  });

  it("removes known client aliases", () => {
    expect(redact("Before/after for JK and Rosalind", { knownNames: ["JK", "Rosalind"] }).text).toBe("Before/after for [client] and [client]");
  });

  it("keeps allow-listed business strings intact", () => {
    const out = redact("Book at Luna Lash Studio @lunalash https://lunalash.example.com", {
      allow: ["Luna Lash Studio", "@lunalash", "https://lunalash.example.com"],
    }).text;
    expect(out).toContain("Luna Lash Studio");
    expect(out).toContain("@lunalash");
    expect(out).toContain("https://lunalash.example.com");
  });

  it("leaves ordinary marketing copy alone", () => {
    const s = "Hybrid lashes are back! Book your Friday fill — 3 spots left this week.";
    expect(redact(s).text).toBe(s);
  });

  it("redacts nested objects deeply", () => {
    const { value, counts } = redactDeep({ a: ["call 07700 900123"], b: { c: "jane@x.io" } });
    expect(JSON.stringify(value)).not.toMatch(/07700|jane@x\.io/);
    expect(counts.email).toBe(1);
  });
});
