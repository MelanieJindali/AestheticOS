import { appCtx } from "@/lib/action-ctx";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { consentStatus } from "@/lib/compliance/validate";
import { RevokeButton } from "./revoke";

export const metadata = { title: "Client consent" };

export default async function ConsentList() {
  const { store, userId, brand } = await appCtx();
  const [records, posts] = await Promise.all([store.list("consent_records", userId, { orderBy: "signedAt", desc: true }), store.list("posts", userId)]);
  const fmt = (iso?: string | null) => (iso ? new Intl.DateTimeFormat(brand.locale, { dateStyle: "medium", timeZone: brand.timezone }).format(new Date(iso)) : "never");
  return (
    <>
      <PageHeader title="Client consent" subtitle="Signed permission for before/afters, testimonials and client photos. We store an alias only: no names, phone numbers or emails." action={<LinkButton href="/consent/new">New consent</LinkButton>} />
      <LinkButton href="/consent/new" className="sm:hidden w-full mb-4">New consent</LinkButton>
      {records.length === 0 ? (
        <Empty title="No consent records yet" action={<LinkButton href="/consent/new">Collect your first signature</LinkButton>}>When a client is happy to be featured, hand them your phone. They read a plain-English form and sign with a finger. It takes about 30 seconds.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {records.map((c) => {
            const problem = consentStatus(c, undefined);
            const used = posts.filter((p) => p.consentRecordId === c.id).length;
            return (
              <Card as="li" key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="h-14 w-36 shrink-0 rounded-xl bg-white ring-1 ring-line overflow-hidden" dangerouslySetInnerHTML={{ __html: c.signatureSvg.startsWith("<svg") && !/<script|on\w+=/i.test(c.signatureSvg) ? c.signatureSvg : "" }} aria-hidden />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{c.clientAlias} <Badge tone={problem ? "block" : "ok"}>{c.revokedAt ? "Withdrawn" : problem ? "Expired" : "Active"}</Badge></p>
                  <p className="text-muted">{c.scope.join(", ")} · {c.platforms === "all" ? "all platforms" : c.platforms.join(", ")} · face {c.allowFace ? "shown" : "hidden"} · tagging {c.allowTagging ? "ok" : "no"}</p>
                  <p className="text-muted">Signed {fmt(c.signedAt)} · expires {fmt(c.expiresAt)} · used in {used} post{used === 1 ? "" : "s"}</p>
                  <p className="text-[11px] text-muted break-all">Evidence hash: {c.evidenceHash.slice(0, 16)}… · text v{c.consentTextVersion}</p>
                </div>
                {!c.revokedAt && <RevokeButton id={c.id} />}
              </Card>
            );
          })}
        </ul>
      )}
    </>
  );
}
