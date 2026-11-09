import { appCtx } from "@/lib/action-ctx";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Fireflies, LogoSymbol } from "@/components/garden";
import { llmAvailable } from "@/lib/ai/gateway";
import { pricingCheck } from "@/lib/muse/pricing";
import { monthlyReview } from "@/lib/muse/suggest";
import { MuseTools } from "./tools";

export const metadata = { title: "Muse" };

export default async function Muse({ searchParams }: { searchParams: Promise<{ tab?: string; post?: string }> }) {
  const { store, userId, brand, settings } = await appCtx();
  const sp = await searchParams;
  const [memory, posts, metrics] = await Promise.all([store.list("agent_memory", userId), store.list("posts", userId), store.list("metric_snapshots", userId)]);
  let prefill: { text: string; platform: string; isBeforeAfter: boolean; hasMaterialConnection: boolean; altText: string } | undefined;
  if (sp.post && /^[0-9a-f-]{36}$/.test(sp.post)) {
    const p = posts.find((x) => x.id === sp.post);
    const v = p && (await store.list("post_variants", userId, { where: { postId: p.id } }))[0];
    if (p && v) prefill = { text: v.caption, platform: v.platform, isBeforeAfter: p.isBeforeAfter, hasMaterialConnection: p.hasMaterialConnection, altText: v.altText };
  }
  const pricing = pricingCheck(brand);
  return (
    <>
      <div className="relative -mx-6 mb-2 h-28 grid place-items-center" aria-hidden>
        <Fireflies count={6} seed={11} />
        <span className="halo grid place-items-center h-20 w-20 rounded-full glass"><LogoSymbol size={44} /></span>
      </div>
      <PageHeader eyebrow="Your business companion" title={<>Muse, <em>at your side</em></>} subtitle="Muse explains its thinking, never publishes without you, and never gives medical advice." action={<span className="inline-flex items-center gap-1.5 text-sm text-muted"><Icon name="lock" size={16} /> Private</span>} />
      <MuseTools
        initialTab={sp.tab ?? (prefill ? "validate" : "ideate")}
        prefill={prefill}
        memory={memory}
        aiOn={llmAvailable(settings)}
        clientDataAllowed={settings.museCanUseClientData}
        pricing={pricing}
        review={monthlyReview(brand, posts, metrics, pricing.summary)}
        currency={brand.currency}
        locale={brand.locale}
      />
    </>
  );
}
