"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { MAX_COMPARE, useCompare, type CompareItem } from "@/lib/compare";
import { shortVnd, vnd } from "@/lib/format";
import type { AiMarketCheck, ListingCard } from "@/lib/types";
import { AiMarkdown } from "./AiMarkdown";
import { ProBadge, Sparkle, UpgradeHint, useMyPlan } from "./PlanGate";

/** Nút thêm/bỏ tin khỏi danh sách so sánh (tối đa 4). */
export function CompareToggle({ item }: { item: CompareItem }) {
  const { items, has, toggle } = useCompare();
  const [full, setFull] = useState(false);
  const on = has(item.id);
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" aria-pressed={on} onClick={() => setFull(!toggle(item))}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${on ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white ring-stone-300 hover:ring-emerald-700"}`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 7h10M4 17h16M14 4l3 3-3 3M10 14l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {on ? "Đã thêm vào so sánh" : "So sánh với tin khác"}
        </button>
        {items.length > 0 && <Link href="/so-sanh" className="text-sm font-semibold text-emerald-800 underline">Xem so sánh ({items.length})</Link>}
      </div>
      {full && <p className="mt-2 text-sm text-red-700">Chỉ so sánh tối đa {MAX_COMPARE} tin. Bỏ bớt một tin trong trang So sánh.</p>}
      <p className="mt-2 text-xs text-stone-500">Chọn 2–4 tin rồi để AI phân tích nên mua tin nào (gói Xanh Pro).</p>
    </div>
  );
}

/** Nút nổi ngay trên nút "Hỏi AI" khi đang chọn tin để so sánh. */
export function CompareBar() {
  const { items } = useCompare();
  const pathname = usePathname();
  if (items.length === 0 || pathname.startsWith("/so-sanh") || pathname.startsWith("/tro-ly-ai") || pathname.startsWith("/dang-tin")) return null;
  return (
    <Link href="/so-sanh"
      className="cx-press fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-white px-4 font-semibold text-emerald-900 shadow-lg ring-1 ring-stone-300 md:bottom-24 md:right-6">
      <span className="flex -space-x-2">
        {items.slice(0, 3).map((i) => (
          // eslint-disable-next-line @next/next/no-img-element
          i.thumbUrl ? <img key={i.id} src={i.thumbUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" /> : <span key={i.id} className="h-7 w-7 rounded-full bg-emerald-100 ring-2 ring-white" />
        ))}
      </span>
      So sánh ({items.length})
    </Link>
  );
}

/** Chủ tin (gói Pro): AI so tin của mình với các tin tương tự đang bán. */
export function MarketCheck({ listingId }: { listingId: string }) {
  const [plan] = useMyPlan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [r, setR] = useState<AiMarketCheck>();
  if (plan === undefined) return null;
  if (!plan?.plan.sellerAi) return <UpgradeHint><b>So tin với chợ bằng AI</b>: biết giá của bạn cao hay thấp so với tin tương tự.</UpgradeHint>;

  async function run() {
    setBusy(true); setError(undefined);
    try { setR(await api<AiMarketCheck>(`ai/listings/${listingId}/market-check`, { method: "POST" })); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  return (
    <div id="so-cho" className="scroll-mt-40 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold text-emerald-900"><Sparkle className="h-5 w-5 text-emerald-700" />So tin với chợ <ProBadge /></span>
        <button type="button" onClick={run} disabled={busy}
          className="cx-press inline-flex items-center gap-2 rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300">
          <Sparkle />{busy ? "Đang xem chợ…" : r ? "Phân tích lại" : "Phân tích"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {r && (
        <div className="mt-3 space-y-3 text-[15px]">
          <p><span className="rounded-full bg-emerald-800 px-3 py-1 text-sm font-bold text-white">{r.position}</span></p>
          <AiMarkdown text={r.summary} />
          <p className="text-sm text-stone-600">
            Giá của bạn: <b>{r.myPrice ? vnd(r.myPrice) : "chưa ghi"}</b>
            {r.stats && <> · {r.stats.count} tin tương tự: {shortVnd(r.stats.min)}–{shortVnd(r.stats.max)}, giữa {shortVnd(r.stats.median)}</>}
            {r.suggestedMin > 0 && <> · Nên đặt: <b>{shortVnd(r.suggestedMin)}–{shortVnd(r.suggestedMax)}</b></>}
          </p>
          {r.suggestions.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{r.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>}
          {r.similar.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {r.similar.slice(0, 6).map((c) => (
                <Link key={c.id} href={`/tin/${c.id}`} className="w-32 shrink-0 rounded-xl bg-white p-2 text-xs ring-1 ring-stone-200 hover:ring-emerald-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.thumbUrl && <img src={c.thumbUrl} alt="" className="mb-1 aspect-square w-full rounded-lg object-cover" />}
                  <span className="line-clamp-2">{c.title}</span>
                  <b className="text-emerald-800">{c.price ? shortVnd(c.price) : ""}</b>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Trang tin (render phía server không có token): người xem thấy nút So sánh, chủ tin thấy So tin với chợ. */
export function ListingAiBox({ card }: { card: ListingCard }) {
  const [ownerId, setOwnerId] = useState<string | null>();
  useEffect(() => {
    let cancelled = false;
    api<{ id: string }>("me").then((m) => { if (!cancelled) setOwnerId(m.id); }, () => { if (!cancelled) setOwnerId(null); });
    return () => { cancelled = true; };
  }, []);
  if (card.type !== "Sell" || ownerId === undefined) return null;
  if (ownerId === card.seller.id) return card.status === "Active" ? <MarketCheck listingId={card.id} /> : null;
  return <CompareToggle item={{ id: card.id, title: card.title, thumbUrl: card.thumbUrl }} />;
}
