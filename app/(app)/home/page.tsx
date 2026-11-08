import Link from "next/link";
import { appCtx } from "@/lib/action-ctx";
import { Badge, Card, Empty, LinkButton, ProgressRing } from "@/components/ui";
import { nextBestActions } from "@/lib/muse/suggest";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/templates/formats";
import { QuickCapture, TaskList, GoalForm, AcceptSuggestion } from "./client";

export const metadata = { title: "Today" };

export default async function Home() {
  const { store, userId, brand } = await appCtx();
  const [posts, variants, schedule, tasks, goals, consents] = await Promise.all([
    store.list("posts", userId), store.list("post_variants", userId), store.list("schedule_items", userId),
    store.list("tasks", userId), store.list("goals", userId, { orderBy: "weekOf", desc: true, limit: 1 }), store.list("consent_records", userId),
  ]);
  const tz = brand.timezone || "UTC";
  const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  const today = dayKey(new Date());
  const todays = schedule.filter((s) => s.state !== "cancelled" && dayKey(new Date(s.scheduledAt)) === today).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const goal = goals[0];
  const goalTasks = tasks.filter((t) => (goal ? t.goalId === goal.id : false));
  const otherTasks = tasks.filter((t) => !goal || t.goalId !== goal.id).filter((t) => !t.done).slice(0, 5);
  const suggestions = nextBestActions(brand, posts, variants, schedule, consents);
  const review = posts.filter((p) => p.status === "review").length;
  const hello = new Intl.DateTimeFormat(brand.locale, { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">{hello}</p>
        <h1 className="text-3xl md:text-4xl text-primary">{brand.ownerFirstName ? `Hi ${brand.ownerFirstName}` : "Today"}</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[["/posts/new", "New post"], ["/posts/batch", "Batch month"], ["/muse", "Ask Muse"], ["/brand", "Brand kit"], ["/templates", "Templates"]].map(([h, l]) => (
          <Link key={h} href={h} className="rounded-2xl bg-surface border border-line px-4 min-h-14 grid place-items-center text-sm font-medium hover:bg-soft text-center">{l}</Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between"><h2 className="text-xl">Going out today</h2>{review > 0 && <Link href="/board" className="text-sm underline">{review} to review</Link>}</div>
          {todays.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing scheduled today. Enjoy the breather, or <Link className="underline" href="/posts/new">create something quick</Link>.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {todays.map((s) => {
                const p = posts.find((x) => x.id === s.postId);
                return (
                  <li key={s.id}>
                    <Link href={s.mode === "ready_to_post" ? `/ready/${s.id}` : `/posts/${s.postId}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:bg-soft">
                      <span className="h-3 w-3 rounded-full" style={{ background: PLATFORM_COLOR[s.platform] }} aria-hidden />
                      <span className="text-sm font-medium w-14">{new Intl.DateTimeFormat(brand.locale, { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(s.scheduledAt))}</span>
                      <span className="text-sm flex-1 truncate">{p?.idea}</span>
                      <Badge tone={s.state === "published" ? "ok" : "neutral"}>{s.state === "published" ? "Posted" : s.mode === "ready_to_post" ? "Ready-to-post" : PLATFORM_LABEL[s.platform]}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-xl">Weekly focus</h2>
          {goal ? (
            <div className="mt-3 flex gap-4 items-start">
              <ProgressRing value={goal.progress} label={`Weekly goal ${Math.round(goal.progress * 100)}% complete`} />
              <div className="flex-1">
                <p className="font-medium">{goal.title}</p>
                <TaskList tasks={goalTasks.slice(0, 3)} />
              </div>
            </div>
          ) : (
            <GoalForm />
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-xl">Quick capture</h2>
        <p className="text-sm text-muted">Snap a photo or jot a thought between clients. It becomes a content idea. Names and contact details are removed automatically.</p>
        <QuickCapture />
      </Card>

      <section aria-labelledby="muse-h">
        <h2 id="muse-h" className="text-xl mb-3">From Muse</h2>
        {suggestions.length === 0 ? (
          <Empty title="You're all caught up">Your queue looks healthy. Muse will nudge you here when something needs attention.</Empty>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s) => (
              <Card as="li" key={s.id} className="flex flex-col gap-2">
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted"><span className="font-medium text-ink">Why: </span>{s.why}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {s.action && <LinkButton href={s.action.href} className="min-h-11 text-sm">{s.action.label}</LinkButton>}
                  <AcceptSuggestion title={s.title} why={s.why} goalId={goal?.id} />
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      {otherTasks.length > 0 && (
        <Card>
          <h2 className="text-xl">Other tasks</h2>
          <TaskList tasks={otherTasks} />
        </Card>
      )}
    </div>
  );
}
