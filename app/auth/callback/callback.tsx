"use client";

import { useEffect, useState } from "react";

/** Finishes an email-link sign-in whose tokens arrive in the URL fragment. */
export function Callback() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.slice(1));
    // Remove tokens from the address bar and history straight away.
    history.replaceState(null, "", window.location.pathname);
    const access_token = p.get("access_token"), refresh_token = p.get("refresh_token");
    if (p.get("error_code") === "otp_expired") return void window.location.replace("/sign-in?error=expired");
    if (!access_token || !refresh_token) return setFailed(true);
    fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access_token, refresh_token }) })
      .then((r) => (r.ok ? window.location.replace("/mfa") : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);
  return (
    <div className="text-center" aria-live="polite">
      <p className="eyebrow">Aesthetic OS</p>
      {failed ? (
        <>
          <h1 className="text-[34px] mt-2">That link didn&apos;t work</h1>
          <p className="text-muted mt-2">It may have expired or already been used. Let&apos;s send a fresh one.</p>
          <a href="/sign-in" className="mt-6 inline-grid place-items-center rounded-full bg-primary text-on-primary px-8 min-h-12">Back to sign in</a>
        </>
      ) : (
        <h1 className="text-[34px] mt-2">Signing you in<span className="text-accent">…</span></h1>
      )}
    </div>
  );
}
