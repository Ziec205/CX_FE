"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AiChat } from "./AiChat";
import { Sparkle } from "./PlanGate";

/** Nút nổi "Hỏi AI" ở góc phải mọi trang, mở khung chat nhanh. Trang /tro-ly-ai đã có khung chat đầy đủ nên ẩn nút. */
export function AiLauncher({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Giữ khung chat sau lần mở đầu để đóng/mở không mất cuộc trò chuyện đang dở.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Chuyển trang thì đóng (reset trong lúc render).
  const [path, setPath] = useState(pathname);
  if (path !== pathname) { setPath(pathname); setOpen(false); }

  if (pathname.startsWith("/tro-ly-ai") || pathname.startsWith("/dang-nhap")) return null;
  // Trang đăng tin có thanh nút "Đăng tin" dính đáy (dưới lg): đẩy nút lên trên thanh đó.
  const lift = pathname.startsWith("/dang-tin") ? "max-md:bottom-[calc(9rem+env(safe-area-inset-bottom))] md:max-lg:bottom-24" : "";

  return (
    <>
      <button type="button" onClick={() => { setOpen((o) => !o); setMounted(true); }} aria-expanded={open} aria-controls="ai-panel"
        className={`cx-press fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-emerald-900 pl-4 pr-5 font-semibold text-white shadow-lg shadow-emerald-950/25 ring-2 ring-white hover:bg-emerald-800 md:bottom-6 md:right-6 ${lift} ${open ? "max-md:hidden" : ""}`}>
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
        ) : <Sparkle className="h-5 w-5 text-wood-400" />}
        <span>{open ? "Đóng" : "Hỏi AI"}</span>
      </button>

      {mounted && (
        <section id="ai-panel" aria-label="Trợ lý AI Chạm Xanh" hidden={!open}
          className="cx-ai-panel fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] top-16 z-50 flex flex-col rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-stone-200 md:inset-x-auto md:bottom-24 md:right-6 md:top-auto md:h-[min(640px,calc(100dvh-8rem))] md:w-[420px]">
          <header className="mb-1 flex items-center justify-between gap-2 border-b border-stone-200 pb-3">
            <div>
              <h2 className="font-display text-xl font-bold text-emerald-900">Trợ lý AI</h2>
              <p className="text-xs text-stone-500">Hỏi về chăm cây, sâu bệnh, mua bán cây</p>
            </div>
            <div className="flex items-center gap-1">
              {signedIn && <Link href="/tro-ly-ai" className="rounded-full px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Mở rộng</Link>}
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng trợ lý AI" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-stone-100">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
              </button>
            </div>
          </header>
          {signedIn ? (
            <div className="min-h-0 flex-1"><AiChat compact /></div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Sparkle className="h-7 w-7" /></span>
              <p className="text-stone-700">Đăng nhập để hỏi Trợ lý AI. Tài khoản miễn phí có <b>3 lượt mỗi ngày</b>, gói Xanh Plus và Xanh Pro có nhiều lượt hơn.</p>
              <Link href={`/dang-nhap?next=${encodeURIComponent(pathname)}`} className="rounded-full bg-emerald-800 px-6 py-2.5 font-semibold text-white hover:bg-emerald-700">Đăng nhập</Link>
              <Link href="/goi" className="text-sm font-semibold text-emerald-800 underline">Xem các gói</Link>
            </div>
          )}
        </section>
      )}
    </>
  );
}
