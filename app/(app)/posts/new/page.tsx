import { appCtx } from "@/lib/action-ctx";
import { PageHeader } from "@/components/ui";
import { NewPostForm } from "./form";

export const metadata = { title: "New post" };

export default async function NewPost({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { brand } = await appCtx();
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Create a post" subtitle="Start from anything: a pillar, a service, a photo, a quick note or a season. You'll get a version for each platform." />
      <NewPostForm services={brand.services.map((s) => ({ id: s.id, name: s.name }))} initial={{ source: sp.source, pillar: sp.pillar, templateType: sp.templateType, season: sp.season, date: sp.date }} />
    </>
  );
}
