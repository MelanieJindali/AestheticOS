import { notFound } from "next/navigation";
import { appCtx } from "@/lib/action-ctx";
import { getPostBundle } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { consentStatus } from "@/lib/compliance/validate";
import { PostEditor } from "./editor";

export const metadata = { title: "Edit post" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { store, userId, brand, session } = await appCtx();
  const bundle = await getPostBundle(store, userId, id);
  if (!bundle) notFound();
  const consents = (await store.list("consent_records", userId)).filter((c) => !consentStatus(c, undefined));
  const refs = new Set<string>();
  for (const v of bundle.variants) for (const s of [v.slots, ...(v.slides ?? [])]) for (const r of [s.imageUrl, s.imageUrlAfter]) if (r) refs.add(r);
  const media: Record<string, string> = {};
  for (const r of refs) { const u = await mediaUrl(session, r); if (u) media[r] = u; }
  const metrics = await store.list("metric_snapshots", userId, { where: { postId: id } });
  return (
    <PostEditor
      key={bundle.post.updatedAt}
      brand={brand}
      post={bundle.post}
      variants={bundle.variants}
      schedule={bundle.schedule}
      consent={bundle.consent}
      consents={consents.map((c) => ({ id: c.id, label: `${c.clientAlias} · ${c.scope.join(", ")}${c.platforms === "all" ? "" : ` · ${c.platforms.join(", ")}`}` }))}
      media={media}
      metrics={metrics}
    />
  );
}
