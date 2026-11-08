import { appCtx } from "@/lib/action-ctx";
import { PageHeader } from "@/components/ui";
import { BatchForm } from "./form";

export const metadata = { title: "Batch a month" };

export default async function Batch() {
  await appCtx();
  return (
    <>
      <PageHeader title="Batch a month" subtitle="A balanced mix across your six content pillars. Everything lands in Needs review, and nothing goes out until you approve it." />
      <BatchForm />
    </>
  );
}
