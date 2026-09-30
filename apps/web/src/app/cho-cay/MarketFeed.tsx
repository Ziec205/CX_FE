"use client";

import { useEffect, useRef, useState } from "react";
import { ListingGrid } from "@/components/ListingCardView";
import { api, errorText } from "@/lib/api";
import type { ListingCard, SearchResult } from "@/lib/types";

const PAGE_SIZE = 24;

/** Nhãn nhóm theo ngày đăng: Hôm nay / Hôm qua / dd/mm/yyyy. */
function dayLabel(iso?: string | null) {
  if (!iso) return "Chưa rõ ngày";
  const d = new Date(iso);
  const today = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86_400_000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  if (diff < 7) return `${diff} ngày trước`;
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

function groupByDay(items: ListingCard[]) {
  const groups: { label: string; items: ListingCard[] }[] = [];
  for (const l of items) {
    const label = dayLabel(l.bumpedAt);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(l);
    else groups.push({ label, items: [l] });
  }
  return groups;
}

/**
 * Danh sách tin cuộn vô hạn. `query` là query string đã lọc (không gồm page/pageSize);
 * trang cha đặt key = query để danh sách làm mới khi đổi bộ lọc.
 */
export function MarketFeed({ query, initial, groupByDate }: { query: string; initial: SearchResult; groupByDate: boolean }) {
  const [items, setItems] = useState<ListingCard[]>(initial.items);
  const [page, setPage] = useState(initial.page);
  const [done, setDone] = useState(initial.page * initial.pageSize >= initial.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || loading || error) return;
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      setLoading(true);
      try {
        const next = page + 1;
        const r = await api<SearchResult>(`listings?${query}${query ? "&" : ""}page=${next}&pageSize=${PAGE_SIZE}`);
        // Tin mới đăng trong lúc cuộn làm lệch trang: bỏ tin đã hiển thị.
        setItems((prev) => {
          const seen = new Set(prev.map((l) => l.id));
          return [...prev, ...r.items.filter((l) => !seen.has(l.id))];
        });
        setPage(next);
        setDone(r.items.length === 0 || next * r.pageSize >= r.total);
      } catch (e) {
        setError(errorText(e));
      } finally {
        setLoading(false);
      }
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [page, done, loading, error, query]);

  if (items.length === 0)
    return <p className="rounded-2xl border border-dashed border-stone-300 py-16 text-center text-stone-500">Chưa có tin phù hợp. Thử bỏ bớt bộ lọc?</p>;

  return (
    <div className="space-y-10">
      {groupByDate
        ? groupByDay(items).map((g, i) => (
          <section key={`${g.label}-${i}`} className="space-y-4">
            <h2 className="z-10 md:sticky md:top-[132px] -mx-1 flex items-center gap-3 bg-stone-50/95 px-1 py-2 font-display text-lg font-bold text-emerald-900 backdrop-blur">
              {g.label}<span className="h-px flex-1 bg-stone-200" /><span className="font-normal normal-case tracking-normal text-stone-500">{g.items.length} tin</span>
            </h2>
            <ListingGrid items={g.items} />
          </section>
        ))
        : <ListingGrid items={items} />}

      {loading && <SkeletonGrid />}
      <div ref={sentinel} aria-live="polite" className="py-6 text-center text-sm text-stone-500">
        {loading && <span className="sr-only">Đang tải thêm tin…</span>}
        {error && (
          <span>{error} · <button type="button" onClick={() => setError(undefined)} className="font-bold text-emerald-800 underline">Thử lại</button></span>
        )}
        {done && !error && "Bạn đã xem hết tin phù hợp."}
      </div>
    </div>
  );
}

/** Khung chờ cùng bố cục với ListingGrid trong lúc tải trang tiếp theo. */
function SkeletonGrid() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="cx-shimmer aspect-[4/5] rounded-2xl" />
          <div className="cx-shimmer h-3 w-1/2 rounded-full" />
          <div className="cx-shimmer h-4 w-5/6 rounded-full" />
          <div className="cx-shimmer h-5 w-1/3 rounded-full" />
        </div>
      ))}
    </div>
  );
}
