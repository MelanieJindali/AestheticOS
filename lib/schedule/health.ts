import type { Pillar, Post, PostVariant, ScheduleItem } from "@/lib/types";
import { PILLARS } from "@/lib/types";
import { PILLAR_INFO } from "@/lib/brand/kit";
import { hasBlocker } from "@/lib/compliance/validate";

export interface HealthReport {
  gaps: { from: string; to: string; days: number }[];
  pillarMix: { pillar: Pillar; count: number; target: number; status: "over" | "under" | "ok" }[];
  missingAlt: string[];
  missingCta: string[];
  blocked: string[];
  scheduledNext14: number;
  score: number;
}

export function queueHealth(posts: Post[], variants: PostVariant[], schedule: ScheduleItem[], now = new Date()): HealthReport {
  const active = schedule.filter((s) => s.state !== "cancelled");
  const horizon = 14;
  const dayKeys = new Set(active.map((s) => s.scheduledAt.slice(0, 10)));
  const gaps: HealthReport["gaps"] = [];
  let run: string[] = [];
  for (let i = 0; i < horizon; i++) {
    const d = new Date(now.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    if (!dayKeys.has(d)) run.push(d);
    else { if (run.length >= 3) gaps.push({ from: run[0], to: run[run.length - 1], days: run.length }); run = []; }
  }
  if (run.length >= 3) gaps.push({ from: run[0], to: run[run.length - 1], days: run.length });

  const upcomingPostIds = new Set(active.filter((s) => new Date(s.scheduledAt) >= now).map((s) => s.postId));
  const pool = posts.filter((p) => upcomingPostIds.has(p.id) || ["draft", "review", "approved"].includes(p.status));
  const total = pool.length || 1;
  const pillarMix = PILLARS.map((pillar) => {
    const count = pool.filter((p) => p.pillar === pillar).length;
    const target = Math.round(PILLAR_INFO[pillar].share * total);
    const status: "over" | "under" | "ok" = pool.length < 4 ? "ok" : count > target + 2 ? "over" : count === 0 && target >= 1 ? "under" : "ok";
    return { pillar, count, target, status };
  });

  const relevant = variants.filter((v) => pool.some((p) => p.id === v.postId));
  const missingAlt = relevant.filter((v) => !v.altText || v.altText.trim().length < 10).map((v) => v.id);
  const missingCta = relevant.filter((v) => !v.ctaUrl && !/\b(book|link in bio|dm|message)\b/i.test(v.caption)).map((v) => v.id);
  const blocked = relevant.filter((v) => hasBlocker(v.compliance)).map((v) => v.id);
  const scheduledNext14 = active.filter((s) => { const t = new Date(s.scheduledAt).getTime(); return t >= now.getTime() && t < now.getTime() + horizon * 86_400_000; }).length;

  const score = Math.max(0, 100 - gaps.reduce((n, g) => n + g.days * 4, 0) - pillarMix.filter((p) => p.status !== "ok").length * 8 - missingAlt.length * 3 - missingCta.length * 2 - blocked.length * 10);
  return { gaps, pillarMix, missingAlt, missingCta, blocked, scheduledNext14, score };
}
