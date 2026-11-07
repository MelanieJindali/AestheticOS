import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="min-h-dvh grid place-items-center p-6 text-center">
      <div><h1 className="text-4xl text-primary">Not found</h1><p className="mt-2 text-muted">That page doesn&apos;t exist, or it isn&apos;t yours.</p><Link href="/home" className="mt-4 inline-block underline">Back to today</Link></div>
    </main>
  );
}
