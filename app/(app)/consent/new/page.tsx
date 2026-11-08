import { appCtx } from "@/lib/action-ctx";
import { PageHeader } from "@/components/ui";
import { ConsentForm } from "./form";

export const metadata = { title: "New consent" };

export default async function NewConsent({ searchParams }: { searchParams: Promise<{ post?: string }> }) {
  const { brand } = await appCtx();
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Client consent" subtitle="Hand your phone to your client. They read, choose and sign." />
      <ConsentForm businessName={brand.businessName} postId={sp.post && /^[0-9a-f-]{36}$/.test(sp.post) ? sp.post : undefined} />
    </>
  );
}
