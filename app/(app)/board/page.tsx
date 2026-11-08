import { appCtx } from "@/lib/action-ctx";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { queueHealth } from "@/lib/schedule/health";
import { PILLAR_INFO } from "@/lib/brand/kit";
import { Board, type BoardCard } from "./board";

export const metadata = { title: "Content" };

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { store, userId } = await appCtx();
  const sp = await searchParams;
  const [posts, variants, schedule] = await Promise.all([store.list("posts", userId), store.list("post_variants", userId), store.list("schedule_items", userId)]);
  const health = queueHealth(posts, variants, schedule);
  const cards: BoardCard[] = posts
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((p) => {
      const vs = variants.filter((v) => v.postId === p.id);
      const next = schedule.filter((s) => s.postId === p.id && s.state !== "cancelled").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
      return {
        id: p.id, idea: p.idea, status: p.status, pillar: p.pillar, templateType: p.templateType,
        platforms: [...new Set(vs.map((v) => v.platform))],
        blocked: vs.some((v) => v.compliance.some((c) => c.severity === "block")) || (p.isBeforeAfter && !p.consentRecordId),
        warnings: vs.reduce((n, v) => n + v.compliance.filter((c) => c.severity === "warn").length, 0),
        missingAlt: vs.some((v) => !v.altText || v.altText.length < 10),
        when: next?.scheduledAt ?? vs[0]?.suggestedTime,
      };
    });

  return (
    <>
      <PageHeader title="Content" subtitle={sp.welcome ? "Your first week is drafted ✨ Review each post, then approve & schedule." : "Ideas → Drafts → Needs review → Approved → Scheduled → Published."}
        action={<LinkButton href="/posts/batch" variant="secondary">Batch a month</LinkButton>} />
      <Card className="mb-5 !p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">Queue health {health.score}/100</span>
          <Badge tone={health.scheduledNext14 ? "ok" : "warn"}>{health.scheduledNext14} scheduled in next 14 days</Badge>
          {health.gaps.map((g) => <Badge key={g.from} tone="warn">{g.days}-day gap from {g.from}</Badge>)}
          {health.pillarMix.filter((p) => p.status !== "ok").map((p) => <Badge key={p.pillar} tone="info">{p.status === "over" ? "Lots of" : "No"} {PILLAR_INFO[p.pillar].label.toLowerCase()}</Badge>)}
          {health.missingAlt.length > 0 && <Badge tone="warn">{health.missingAlt.length} missing alt text</Badge>}
          {health.missingCta.length > 0 && <Badge tone="info">{health.missingCta.length} missing CTA</Badge>}
          {health.blocked.length > 0 && <Badge tone="block">{health.blocked.length} blocked</Badge>}
        </div>
      </Card>
      <Board cards={cards} />
    </>
  );
}
