"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "./LogoutButton";

export interface MenuLink { href: string; label: string }

/** Menu dạng ngăn kéo cho màn hình nhỏ (< lg). Dùng <dialog> để có sẵn khóa focus, Esc và nền mờ. */
export function MobileMenu({ links, signedIn }: { links: MenuLink[]; signedIn: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Mở menu: thư viện, bản đồ và tài khoản" aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      <dialog ref={ref} onClose={() => setOpen(false)} aria-label="Menu"
        // Bấm nền mờ hoặc bấm một liên kết (chuyển trang) thì đóng menu.
        onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).closest("a")) setOpen(false); }}
        className="cx-drawer m-0 ml-auto h-dvh max-h-none w-[min(20rem,85vw)] max-w-none bg-stone-50 p-0 backdrop:bg-stone-900/40 open:flex open:flex-col">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <span className="font-display text-xl font-extrabold text-emerald-800">Chạm Xanh</span>
          <button type="button" onClick={() => setOpen(false)} aria-label="Đóng menu" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-stone-200">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={active(l.href) ? "page" : undefined}
                  className={`block rounded-xl px-4 py-3 text-[16px] ${active(l.href) ? "bg-emerald-100 font-bold text-emerald-900" : "hover:bg-stone-200/70"}`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-3 border-t border-stone-200 p-5">
          <Link href="/dang-tin" className="block rounded-full bg-emerald-800 py-3 text-center font-bold text-stone-50 hover:bg-emerald-700">Đăng tin</Link>
          {signedIn
            ? <div className="text-center"><LogoutButton /></div>
            : <Link href="/dang-nhap" className="block rounded-full border border-emerald-800/30 bg-white py-3 text-center font-bold text-emerald-900">Đăng nhập / Tạo tài khoản</Link>}
        </div>
      </dialog>
    </>
  );
}
