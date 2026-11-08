"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeConsentAction } from "@/app/actions/consent";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";

export function RevokeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <Button variant="secondary" disabled={pending} onClick={() => {
      if (!confirm("Withdraw this consent? Scheduled posts using it will be cancelled.")) return;
      start(async () => {
        const r = await revokeConsentAction(id);
        if (!r.ok) return toast({ message: r.error, tone: "error" });
        toast({ message: `Consent withdrawn. ${r.data?.cancelled ?? 0} scheduled post(s) cancelled.${r.data?.published ? ` Please remove ${r.data.published} already-published post(s) from the platform.` : ""}`, tone: "ok" });
        router.refresh();
      });
    }}>Withdraw</Button>
  );
}
