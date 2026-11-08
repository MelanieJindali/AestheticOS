import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Runs before every request: strict nonce-based CSP, security headers, CSRF
// origin check for API mutations, and Supabase session refresh.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const DEMO = process.env.DEMO_MODE === "true" || !SUPABASE_URL; // app code refuses to run without Supabase in production unless DEMO_MODE=true

function csp(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  const storage = SUPABASE_URL ? ` ${new URL(SUPABASE_URL).origin}` : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Inline style *attributes* are needed for brand theming and template previews.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data:${storage}`,
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function securityHeaders(res: NextResponse, policy: string) {
  res.headers.set("Content-Security-Policy", policy);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // CSRF: API mutations must come from our own origin (server actions are
  // already origin-checked by Next.js). The cron endpoint uses a bearer secret.
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(method) && !pathname.startsWith("/api/cron/")) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) {
      return new NextResponse("Cross-site request blocked", { status: 403 });
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = csp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!DEMO) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options } of list) response.cookies.set(name, value, { ...options, httpOnly: true, secure: true, sameSite: "lax" });
        },
      },
    });
    // Refreshes the auth token if needed. Do not remove.
    await supabase.auth.getUser();
  }

  return securityHeaders(response, policy);
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|manifest.webmanifest|sw.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
