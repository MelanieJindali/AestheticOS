import { notFound } from "next/navigation";
import Link from "next/link";
import { appCtx } from "@/lib/action-ctx";
import { Badge, Card, PageHeader } from "@/components/ui";
import { PLATFORM_LABEL } from "@/lib/templates/formats";
import { PLATFORM_RULES } from "@/lib/posts/platforms";
import { ReadyActions } from "./actions";

export const metadata = { title: "Ready to post" };

const OPEN: Partial<Record<string, string>> = {
  instagram: "https://www.instagram.com/", tiktok: "https://www.tiktok.com/upload", facebook: "https://www.facebook.com/", pinterest: "https://www.pinterest.com/pin-creation-tool/",
  linkedin: "https://www.linkedin.com/feed/", youtube: "https://studio.youtube.com/", x: "https://x.com/compose/post", threads: "https://www.threads.net/", gbp: "https://business.google.com/",
};

export default async function Ready({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { store, userId, brand } = await appCtx();
  const item = await store.get("schedule_items", userId, id);
  const v = item && (await store.get("post_variants", userId, item.variantId));
  const post = item && (await store.get("posts", userId, item.postId));
  if (!item || !v || !post) notFound();
  const when = new Intl.DateTimeFormat(brand.locale, { dateStyle: "full", timeStyle: "short", timeZone: brand.timezone }).format(new Date(item.scheduledAt));
  const slides = v.slides?.length ?? 0;
  return (
    <>
      <PageHeader title="Ready to post" subtitle={`${PLATFORM_LABEL[item.platform]} · ${when}`} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/render/${v.id}${slides ? "?slide=0" : ""}`} alt={v.altText} className="w-full rounded-2xl ring-1 ring-line" />
          <div className="flex flex-wrap gap-2">
            {slides ? Array.from({ length: slides }, (_, i) => <a key={i} className="rounded-full border border-line px-4 min-h-11 grid place-items-center text-sm" href={`/api/render/${v.id}?slide=${i}&download`}>Slide {i + 1}</a>)
              : <a className="rounded-full bg-primary text-on-primary px-5 min-h-12 grid place-items-center" href={`/api/render/${v.id}?download`}>Download image</a>}
          </div>
        </div>
        <Card className="flex flex-col gap-4">
          {item.state === "published" ? <Badge tone="ok">Posted ✓</Badge> : <Badge>{item.state === "reminded" ? "Reminder sent" : "Waiting"}</Badge>}
          <ol className="text-sm list-decimal pl-5 flex flex-col gap-1">
            <li>Download the image{slides ? "s" : ""}.</li>
            <li>Copy the caption below.</li>
            <li>Open {PLATFORM_LABEL[item.platform]}, paste and post.{post.hasMaterialConnection ? " Switch on the paid-partnership label too." : ""}</li>
            <li>Come back and tap <b>Mark as posted</b>.</li>
          </ol>
          <ReadyActions itemId={item.id} caption={v.caption} altText={v.altText} posted={item.state === "published"} openUrl={OPEN[item.platform]} scheduledAt={item.scheduledAt} tz={brand.timezone} />
          <pre className="whitespace-pre-wrap text-sm rounded-2xl bg-soft p-4 font-sans">{v.caption}</pre>
          {v.script?.length ? <ol className="text-sm list-decimal pl-5">{v.script.map((l, i) => <li key={i}>{l}</li>)}</ol> : null}
          <p className="text-xs text-muted">{PLATFORM_RULES[item.platform].note}</p>
          <Link className="text-sm underline" href={`/posts/${post.id}`}>Edit this post</Link>
        </Card>
      </div>
    </>
  );
}
