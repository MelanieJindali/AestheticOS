import { appCtx } from "@/lib/action-ctx";
import { LinkButton, PageHeader } from "@/components/ui";
import { CalendarView, type CalItem } from "./calendar";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const { store, userId, brand } = await appCtx();
  const [schedule, posts] = await Promise.all([store.list("schedule_items", userId), store.list("posts", userId)]);
  const items: CalItem[] = schedule.filter((s) => s.state !== "cancelled").map((s) => ({
    id: s.id, postId: s.postId, platform: s.platform, at: s.scheduledAt, state: s.state, mode: s.mode,
    idea: posts.find((p) => p.id === s.postId)?.idea ?? "",
  }));
  return (
    <>
      <PageHeader title="Calendar" subtitle="Drag a post to another day to move it. Times are in your studio's time zone." action={<LinkButton href="/api/ics" variant="secondary" className="hidden sm:inline-flex">Add to my calendar</LinkButton>} />
      <CalendarView items={items} tz={brand.timezone || "UTC"} locale={brand.locale} />
      <p className="mt-4 text-sm text-muted">Tip: <a className="underline" href="/api/ics">download your calendar (.ics)</a> to get a phone alert at each posting time, even without notifications switched on.</p>
    </>
  );
}
