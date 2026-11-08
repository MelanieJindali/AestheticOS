import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { env, isDemoMode } from "@/lib/env";
import { safeEqual } from "@/lib/security/crypto";
import { supabaseAdmin } from "@/lib/db/supabase";
import { PLATFORM_LABEL } from "@/lib/templates/formats";
import type { Platform } from "@/lib/types";

// Scheduled worker (call every 5 minutes from Supabase pg_cron, Vercel Cron or
// any scheduler). Sends Ready-to-Post reminders by Web Push and/or email.
// Notifications contain no caption text or client data, only a deep link.

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!env.cronSecret || !safeEqual(auth, `Bearer ${env.cronSecret}`)) return new NextResponse("Unauthorized", { status: 401 });
  if (isDemoMode()) return NextResponse.json({ ok: true, note: "demo mode: reminders are shown in-app and via .ics files" });

  const db = supabaseAdmin();
  const horizon = new Date(Date.now() + 5 * 60_000).toISOString();
  const { data: due, error } = await db.from("schedule_items").select("id,user_id,platform,scheduled_at,mode").eq("state", "pending").lte("scheduled_at", horizon).limit(500);
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  if (env.vapidPublic && env.vapidPrivate) webpush.setVapidDetails(env.vapidSubject, env.vapidPublic, env.vapidPrivate);
  let pushed = 0, emailed = 0;
  for (const item of due ?? []) {
    const title = `Time to post on ${PLATFORM_LABEL[item.platform as Platform] ?? item.platform}`;
    const url = `/ready/${item.id}`;
    const { data: settings } = await db.from("user_settings").select("reminders_push,reminders_email").eq("user_id", item.user_id).maybeSingle();
    if (settings?.reminders_push !== false && env.vapidPublic) {
      const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,keys").eq("user_id", item.user_id);
      for (const s of subs ?? []) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title, body: "Your image and caption are ready to copy.", url }), { TTL: 3600 }); pushed++; }
        catch (e) { if ((e as { statusCode?: number }).statusCode === 410) await db.from("push_subscriptions").delete().eq("id", s.id); }
      }
    }
    if (settings?.reminders_email && env.resendKey && env.emailFrom) {
      const { data: u } = await db.auth.admin.getUserById(item.user_id);
      if (u?.user?.email) {
        const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.emailFrom, to: u.user.email, subject: title, text: `Your Ready-to-Post package is waiting: ${env.appUrl}${url}` }) });
        if (r.ok) emailed++;
      }
    }
    await db.from("schedule_items").update({ state: "reminded" }).eq("id", item.id).eq("state", "pending");
    await db.from("audit_log").insert({ user_id: item.user_id, actor: "system", action: "schedule.reminder_sent", target: item.id, meta: { mode: item.mode } });
  }
  return NextResponse.json({ ok: true, due: due?.length ?? 0, pushed, emailed });
}

export const GET = handle;
export const POST = handle;
