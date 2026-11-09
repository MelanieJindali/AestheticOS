import { MoonLoader } from "@/components/garden";

export default function Loading() {
  return (
    <div className="grid place-items-center gap-3 py-24 text-sm text-muted">
      <MoonLoader label="Gathering your garden" />
      <span aria-hidden>Gathering your garden…</span>
    </div>
  );
}
