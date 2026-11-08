import type { Post, PostVariant, ScheduleItem } from "@/lib/types";
import { PLATFORM_LABEL } from "@/lib/templates/formats";

const pad = (n: number) => String(n).padStart(2, "0");
function icsDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function fold(line: string) {
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 73) out.push((i ? " " : "") + line.slice(i, i + 73));
  return out.join("\r\n");
}

/**
 * Calendar file with an alarm at posting time. Works with every phone
 * calendar, so reminders arrive even without push or email configured.
 * Contains only the post idea + a deep link (never the full caption).
 */
export function buildIcs(items: { item: ScheduleItem; post: Post; variant: PostVariant }[], appUrl: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aesthetic OS//Ready-to-Post//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const { item, post } of items) {
    const start = icsDate(item.scheduledAt);
    const end = icsDate(new Date(new Date(item.scheduledAt).getTime() + 15 * 60_000).toISOString());
    const link = `${appUrl}/ready/${item.id}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@aesthetic-os`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      fold(`SUMMARY:${icsEscape(`Post to ${PLATFORM_LABEL[item.platform]}: ${post.idea.slice(0, 60)}`)}`),
      fold(`DESCRIPTION:${icsEscape(`Your Ready-to-Post package (image + caption) is here: ${link}`)}`),
      fold(`URL:${link}`),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:-PT0M",
      fold(`DESCRIPTION:${icsEscape(`Time to post on ${PLATFORM_LABEL[item.platform]}`)}`),
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
