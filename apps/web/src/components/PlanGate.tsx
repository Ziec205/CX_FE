"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MyPlan } from "@/lib/types";

/** Gói hiện tại của người đang đăng nhập (null khi chưa đăng nhập hoặc lỗi). */
export function useMyPlan(): [MyPlan | null | undefined, () => void] {
  const [plan, setPlan] = useState<MyPlan | null>();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api<MyPlan>("me/plan").then((p) => { if (!cancelled) setPlan(p); }, () => { if (!cancelled) setPlan(null); });
    return () => { cancelled = true; };
  }, [tick]);
  return [plan, () => setTick((t) => t + 1)];
}

export function Sparkle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    </svg>
  );
}

export function ProBadge() {
  return <span className="rounded-full bg-wood-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-stone-900">Pro</span>;
}

/** Hộp mời nâng gói, hiện thay cho tính năng bị khóa. */
export function UpgradeHint({ children, plan = "Pro" }: { children: React.ReactNode; plan?: "Plus" | "Pro" }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-wood-100 px-4 py-3 text-[15px] text-wood-800 ring-1 ring-wood-200">
      <span>{children}</span>
      <Link href={`/goi?chon=${plan}`} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">Xem gói {plan === "Pro" ? "Xanh Pro" : "Xanh Plus"}</Link>
    </div>
  );
}
