import { appCtx } from "@/lib/action-ctx";
import { LinkButton, PageHeader } from "@/components/ui";
import { BrandEditor } from "./editor";

export const metadata = { title: "Brand kit" };

export default async function BrandPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { brand } = await appCtx();
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Brand kit" subtitle={sp.welcome ? "Here's your brand. Tweak anything, and every template and draft updates instantly." : "Everything that makes your brand yours. Edit once and it flows everywhere."}
        action={<LinkButton href="/api/brand/guide" variant="secondary" className="hidden sm:inline-flex">Brand guide PDF</LinkButton>} />
      <LinkButton href="/api/brand/guide" variant="secondary" className="sm:hidden mb-4 w-full">Download brand guide (PDF)</LinkButton>
      <BrandEditor key={brand.version} brand={brand} />
    </>
  );
}
