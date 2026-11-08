import { appCtx } from "@/lib/action-ctx";
import { PageHeader } from "@/components/ui";
import { TEMPLATE_TYPES } from "@/lib/templates/formats";
import { sampleSlots } from "@/lib/templates/samples";
import { TemplateLibrary } from "./library";

export const metadata = { title: "Templates" };

export default async function Templates() {
  const { brand } = await appCtx();
  const samples = Object.fromEntries(TEMPLATE_TYPES.map((t) => [t.type, sampleSlots(t.type, brand)]));
  return (
    <>
      <PageHeader eyebrow="Create" title="Template library" subtitle="Every template is themed to your brand kit. Colours, fonts and your name are locked in. Text and photos are yours to change." />
      <TemplateLibrary brand={brand} samples={samples} />
    </>
  );
}
