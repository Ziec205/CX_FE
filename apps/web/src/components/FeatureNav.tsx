"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Năm tính năng chính. Chợ cây luôn nổi nhất (nền vàng mai); Nhắc tưới dùng xanh nước. */
export const FEATURES = [
  { key: "market", href: "/cho-cay", label: "Chợ cây", icon: "M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6" },
  { key: "explore", href: "/kham-pha", label: "Khám phá", icon: "M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z" },
  { key: "garden", href: "/vuon-cua-toi", label: "Hồ sơ vườn", icon: "M12 21v-8M12 13c0-4 3-7 7-7 0 4-3 7-7 7zM12 15c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5zM6 21h12" },
  { key: "water", href: "/vuon-cua-toi#lich-nhac", label: "Nhắc tưới", icon: "M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" },
  { key: "community", href: "/cong-dong", label: "Cộng đồng", icon: "M4 5h11v8H8l-4 3zM9 16v1h7l4 3V9h-2" },
] as const;

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function useActive() {
  const pathname = usePathname();
  return (key: string, href: string) => {
    const base = href.split("#")[0];
    // "Nhắc tưới" và "Hồ sơ vườn" chung một trang: chỉ đánh dấu Hồ sơ vườn.
    if (key === "water") return false;
    return pathname === base || pathname.startsWith(`${base}/`);
  };
}

/** Thanh tính năng ngang dưới header, từ md trở lên. */
export function FeatureRail() {
  const active = useActive();
  return (
    <nav aria-label="Tính năng chính" className="hidden border-t border-stone-200 md:block">
      <ul className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-2 sm:px-6 lg:px-10">
        {FEATURES.map((f) => {
          const on = active(f.key, f.href);
          const market = f.key === "market";
          const cls = market
            ? `bg-wood-400 text-stone-900 hover:bg-wood-200 ${on ? "ring-2 ring-stone-900" : ""}`
            : f.key === "water"
              ? "text-water-700 hover:bg-water-50"
              : on ? "bg-emerald-100 text-emerald-900" : "text-stone-700 hover:bg-stone-100";
          return (
            <li key={f.key}>
              <Link href={f.href} aria-current={on ? "page" : undefined}
                className={`cx-press inline-flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-semibold ${market ? "mr-2 px-5" : ""} ${cls}`}>
                <Icon d={f.icon} className="h-[18px] w-[18px]" />
                {f.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Thanh tab cố định dưới đáy màn hình điện thoại. */
export function FeatureTabBar() {
  const active = useActive();
  return (
    <nav aria-label="Tính năng chính" className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] [transform:translateZ(0)] md:hidden">
      <ul className="grid grid-cols-5">
        {FEATURES.map((f) => {
          const on = active(f.key, f.href);
          const market = f.key === "market";
          return (
            <li key={f.key}>
              <Link href={f.href} aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] font-semibold ${on ? "text-emerald-800" : f.key === "water" ? "text-water-700" : "text-stone-600"}`}>
                <span className={`flex h-8 w-12 items-center justify-center rounded-full ${market ? "bg-wood-400 text-stone-900" : on ? "bg-emerald-100" : ""}`}>
                  <Icon d={f.icon} />
                </span>
                {f.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
