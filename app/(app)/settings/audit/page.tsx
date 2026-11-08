import { appCtx } from "@/lib/action-ctx";
import { Badge, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Activity log" };

export default async function Audit() {
  const { store, userId, brand } = await appCtx();
  const log = await store.list("audit_log", userId, { orderBy: "createdAt", desc: true, limit: 300 });
  const fmt = new Intl.DateTimeFormat(brand.locale, { dateStyle: "medium", timeStyle: "short", timeZone: brand.timezone });
  return (
    <>
      <PageHeader title="Activity log" subtitle="A tamper-proof record of sign-ins, Muse actions, publishing and account changes. It never stores your content or client details." />
      <Card className="!p-0 overflow-hidden">
        <ul className="divide-y divide-line">
          {log.map((e) => (
            <li key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-4 py-3 text-sm">
              <span className="text-muted w-40 shrink-0">{fmt.format(new Date(e.createdAt))}</span>
              <Badge tone={e.actor === "muse" ? "info" : e.actor === "system" ? "neutral" : "ok"}>{e.actor}</Badge>
              <span className="font-mono text-xs">{e.action}</span>
              {e.meta && <span className="text-xs text-muted truncate">{Object.entries(e.meta).map(([k, v]) => `${k}=${v}`).join(" · ")}</span>}
            </li>
          ))}
          {log.length === 0 && <li className="p-4 text-sm text-muted">No activity yet.</li>}
        </ul>
      </Card>
    </>
  );
}
