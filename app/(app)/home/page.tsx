import Link from "next/link";
import { appCtx } from "@/lib/action-ctx";
import { Badge, Card, Empty, ITEM, LinkButton } from "@/components/ui";
import { Constellation, Fireflies, LogoSymbol, Sprig } from "@/components/garden";
import { PrivateNote } from "@/components/icons";
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
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat(brand.locale, { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(now);
  const [focus, ...more] = suggestions;
  return (
    <div className="relative flex flex-col gap-8 stagger">
      <Fireflies count={6} className="-mx-6 -mt-6 h-64" />
      <Sprig className="absolute -right-4 -top-4 opacity-60" width={110} />
      <header className="relative">
        <p className="eyebrow">{dateLabel}</p>
        <h1 className="text-[36px] md:text-[44px] mt-1">{greeting}{brand.ownerFirstName ? <>,<br /><em>{brand.ownerFirstName}</em></> : null}</h1>
      </header>

      {focus ? (
        <Card>
          <p className="eyebrow !text-primary flex items-center gap-2"><span className="halo inline-grid"><LogoSymbol size={24} /></span> Muse · today&apos;s gentle focus</p>
          <p className="font-heading text-[26px] mt-2 leading-snug">{focus.title}</p>
          <p className="text-sm text-muted mt-2">{focus.why}</p>
          <div className="flex gap-2 mt-5 flex-wrap">
            {focus.action && <LinkButton href={focus.action.href}>{focus.action.label}</LinkButton>}
            <AcceptSuggestion title={focus.title} why={focus.why} goalId={goal?.id} />
          </div>
        </Card>
      ) : (
        <Empty title="All calm today" action={<LinkButton href="/posts/new">Create a post</LinkButton>}>Your queue looks healthy. Muse will nudge you here when something needs you.</Empty>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section aria-labelledby="today-h">
          <div className="flex items-baseline justify-between mb-3"><h2 id="today-h" className="text-[22px]">Going out today</h2>{review > 0 && <Link href="/board" className="text-sm text-primary">{review} to review</Link>}</div>
          {todays.length === 0 ? (
            <p className="text-sm text-muted">Nothing goes out today. Enjoy the breathing room.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todays.map((s) => {
                const p = posts.find((x) => x.id === s.postId);
                return (
                  <li key={s.id}>
                    <Link href={s.mode === "ready_to_post" ? `/ready/${s.id}` : `/posts/${s.postId}`} className={`${ITEM} flex items-center gap-3 p-3 hover:border-accent transition`}>
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PLATFORM_COLOR[s.platform] }} aria-hidden />
                      <span className="text-sm w-16 shrink-0 text-muted">{new Intl.DateTimeFormat(brand.locale, { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(s.scheduledAt))}</span>
                      <span className="text-sm flex-1 min-w-0 truncate">{p?.idea}</span>
                      <Badge tone={s.state === "published" ? "ok" : "warn"}>{s.state === "published" ? "Posted" : PLATFORM_LABEL[s.platform]}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="week-h">
          <h2 id="week-h" className="text-[22px] mb-3">This week&apos;s garden</h2>
          {goal ? (
            <div className="glass rounded-[20px] p-4">
              <Constellation total={Math.max(goalTasks.length, 3)} done={goalTasks.filter((t) => t.done).length} label={`Weekly intention: ${goalTasks.filter((t) => t.done).length} of ${goalTasks.length} tasks bloomed`} />
              <p className="text-sm mt-2">Intention: <span className="text-primary">{goal.title}</span></p>
              <TaskList tasks={goalTasks.slice(0, 3)} />
            </div>
          ) : (
            <GoalForm />
          )}
        </section>
      </div>

      <Card>
        <div className="flex items-baseline justify-between gap-2"><h2 className="text-[22px]">Quick capture</h2><PrivateNote /></div>
        <p className="text-sm text-muted mt-1">A photo or a thought between clients becomes a content idea. Names and contact details are removed before anything is saved.</p>
        <QuickCapture />
      </Card>

      {more.length > 0 && (
        <section aria-labelledby="muse-h">
          <h2 id="muse-h" className="text-[22px] mb-3">More from Muse</h2>
          <ul className="flex flex-col gap-2">
            {more.map((s) => (
              <li key={s.id} className={`${ITEM} p-4 flex flex-col sm:flex-row sm:items-center gap-3`}>
                <div className="flex-1 min-w-0"><p className="font-medium">{s.title}</p><p className="text-sm text-muted">{s.why}</p></div>
                {s.action && <Link href={s.action.href} className="text-sm text-primary shrink-0">{s.action.label}</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {otherTasks.length > 0 && (
        <section><h2 className="text-[22px] mb-2">Other tasks</h2><TaskList tasks={otherTasks} /></section>
      )}

      <nav aria-label="Shortcuts" className="flex flex-wrap gap-2 text-sm">
        {[["/posts/batch", "Plan a month"], ["/templates", "Templates"], ["/consent", "Client consent"]].map(([h, l]) => <Link key={h} href={h} className="rounded-full bg-soft px-4 min-h-11 grid place-items-center text-muted hover:text-ink">{l}</Link>)}
      </nav>
    </div>
  );
}
