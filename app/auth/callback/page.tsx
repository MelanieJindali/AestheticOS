import { Callback } from "./callback";

export const metadata = { title: "Signing you in" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main id="main" className="min-h-dvh grid place-items-center px-6">
      <Callback />
    </main>
  );
}
