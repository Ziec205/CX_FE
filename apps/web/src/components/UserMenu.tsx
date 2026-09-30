"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Me } from "@/lib/types";

const ITEMS: [string, string][] = [
  ["/tai-khoan", "Tài khoản & tin của tôi"], ["/tin-nhan", "Tin nhắn"], ["/don-hang", "Đơn hàng"],
  ["/vuon-cua-toi", "Hồ sơ vườn"], ["/yeu-thich", "Tin đã lưu"], ["/vi", "Ví Xu Xanh"], ["/thong-bao", "Thông báo"],
];

/** Nút tên người dùng trên header; bấm mở menu cá nhân (có Đăng xuất). Dùng popover gốc của trình duyệt: bấm ra ngoài hoặc Esc là đóng. */
export function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const pop = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [me, setMe] = useState<Me>();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => { api<Me>("me").then(setMe, () => {}); }, []);
  // Mở ra: đặt menu ngay dưới nút tên, mép phải thẳng với mép phải của nút. Đổi cỡ cửa sổ thì đóng để khỏi lệch.
  useEffect(() => {
    const el = pop.current;
    if (!el) return;
    const place = (e: Event) => {
      if ((e as ToggleEvent).newState !== "open" || !trigger.current) return;
      const r = trigger.current.getBoundingClientRect();
      el.style.top = `${Math.round(r.bottom + 8)}px`;
      el.style.right = `${Math.max(12, Math.round(document.documentElement.clientWidth - r.right))}px`;
    };
    const close = () => el.hidePopover?.();
    el.addEventListener("beforetoggle", place);
    window.addEventListener("resize", close);
    return () => { el.removeEventListener("beforetoggle", place); window.removeEventListener("resize", close); };
  }, []);

  // Chuyển trang thì đóng menu.
  useEffect(() => { pop.current?.hidePopover?.(); }, [pathname]);

  const name = me?.displayName ?? "Tài khoản";
  const initial = me?.displayName.trim().charAt(0).toUpperCase() || "";

  async function logout() {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <button ref={trigger} type="button" popoverTarget="user-menu" aria-haspopup="menu"
        className="flex h-11 max-w-[14rem] items-center gap-2 rounded-full bg-white pl-1 pr-1 ring-1 ring-stone-300 hover:ring-emerald-700 sm:pr-4">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wood-400 font-display font-bold text-stone-900">
          {initial || <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" strokeLinecap="round" /></svg>}
        </span>
        <span className="hidden truncate font-semibold sm:inline">{name}</span>
        <span className="sr-only sm:hidden">Mở menu tài khoản của {name}</span>
      </button>

      <div ref={pop} id="user-menu" popover="auto" role="menu" aria-label="Menu tài khoản"
        className="cx-pop fixed inset-auto m-0 w-72 max-w-[calc(100vw-1.5rem)] rounded-3xl bg-white p-2 shadow-xl ring-1 ring-stone-200">
        <div className="flex items-center gap-3 border-b border-stone-200 px-3 pb-3 pt-2">
          <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wood-400 font-display text-lg font-bold text-stone-900">{initial}</span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            {me?.username && <p className="truncate text-sm text-stone-500">@{me.username}</p>}
          </div>
        </div>
        <ul className="py-1">
          {ITEMS.map(([href, label]) => (
            <li key={href}>
              <Link href={href} role="menuitem" aria-current={pathname === href ? "page" : undefined}
                className={`block rounded-2xl px-3 py-2.5 ${pathname === href ? "bg-emerald-50 font-semibold text-emerald-900" : "hover:bg-stone-50"}`}>{label}</Link>
            </li>
          ))}
        </ul>
        <div className="border-t border-stone-200 pt-1">
          <button type="button" role="menuitem" onClick={logout} disabled={leaving}
            className="block w-full rounded-2xl px-3 py-2.5 text-left font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
            {leaving ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      </div>
    </>
  );
}
