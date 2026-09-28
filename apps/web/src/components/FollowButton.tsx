"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type ApiError } from "@/lib/api";
import { btn } from "./ui";

/** Theo dõi người bán: nhận thông báo khi họ đăng tin mới. */
export function FollowButton({ sellerId, className = btn.secondary }: { sellerId: string; className?: string }) {
  const router = useRouter();
  const [following, setFollowing] = useState<boolean>();
  const [self, setSelf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<{ id: string }>("me"), api<{ sellerId: string }[]>("me/follows")]).then(([me, list]) => {
      if (cancelled) return;
      setSelf(me.id === sellerId);
      setFollowing(list.some((f) => f.sellerId === sellerId));
    }, () => { if (!cancelled) setFollowing(false); });
    return () => { cancelled = true; };
  }, [sellerId]);

  async function toggle() {
    try {
      await api(`me/follows/${sellerId}`, { method: following ? "DELETE" : "PUT" });
      setFollowing(!following);
    } catch (e) {
      if ((e as ApiError).status === 401) router.push(`/dang-nhap?next=${encodeURIComponent(window.location.pathname)}`);
    }
  }

  if (self || following === undefined) return null;
  return <button onClick={toggle} className={className}>{following ? "✓ Đang theo dõi" : "+ Theo dõi"}</button>;
}
