"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Số thông báo chưa đọc; làm mới mỗi phút và khi quay lại tab. */
export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => api<{ count: number }>("me/notifications/unread-count").then((r) => { if (!cancelled) setCount(r.count); }, () => {});
    load();
    const timer = window.setInterval(load, 60_000);
    const onFocus = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onFocus); };
  }, []);

  return (
    <Link href="/thong-bao" aria-label={`Thông báo${count ? `, ${count} chưa đọc` : ""}`} className="relative hover:text-emerald-700">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" strokeLinejoin="round" />
        <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-2 -top-1.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
