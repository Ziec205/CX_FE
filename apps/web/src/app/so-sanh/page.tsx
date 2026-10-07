"use client";

import Link from "next/link";
import { useState } from "react";
import { AiMarkdown } from "@/components/AiMarkdown";
import { ProBadge, Sparkle, UpgradeHint, useMyPlan } from "@/components/PlanGate";
import { api, errorText } from "@/lib/api";
import { useCompare } from "@/lib/compare";
import { priceLabel } from "@/lib/format";
import { isPlanError } from "@/lib/plans";
import { provinceName } from "@/lib/provinces";
import type { AiCompareResult } from "@/lib/types";

export default function ComparePage() {
  const { items, remove, clear } = useCompare();
  const [plan] = useMyPlan();
  const [result, setResult] = useState<AiCompareResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; plan: boolean }>();

  async function run() {
    setBusy(true); setError(undefined);
    try { setResult(await api<AiCompareResult>("ai/compare", { method: "POST", json: { listingIds: items.map((i) => i.id) } })); }
    catch (e) { setError({ message: errorText(e), plan: isPlanError(e) }); } finally { setBusy(false); }
  }

  // Kết quả cũ không còn khớp danh sách đang chọn thì ẩn đi.
  const shown = result && result.listings.length === items.length && result.listings.every((l) => items.some((i) => i.id === l.id)) ? result : undefined;
  const cards = shown?.listings;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-extrabold text-emerald-900 sm:text-5xl">So sánh cây</h1>
          <p className="mt-1 text-stone-600">Chọn 2–4 tin trong Chợ cây (nút &ldquo;So sánh với tin khác&rdquo; trên trang tin), rồi để AI phân tích giúp.</p>
        </div>
        {items.length > 0 && <button type="button" onClick={() => { clear(); setResult(undefined); }} className="text-sm font-semibold text-stone-600 hover:text-red-700">Bỏ chọn tất cả</button>}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-stone-300 p-10 text-center text-stone-600">
          Chưa chọn tin nào. Vào <Link href="/cho-cay" className="font-semibold text-emerald-800 underline">Chợ cây</Link>, mở một tin và bấm <b>So sánh với tin khác</b>.
        </div>
      ) : (
        <div className={`grid gap-4 ${items.length >= 3 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2"}`}>
          {items.map((i) => {
            const card = cards?.find((c) => c.id === i.id);
            const ai = shown?.items.find((x) => x.listingId === i.id);
            const best = shown?.recommendedId === i.id;
            return (
              <article key={i.id} className={`flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ${best ? "ring-4 ring-wood-400" : "ring-stone-200"}`}>
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {(i.thumbUrl ?? card?.thumbUrl) ? <img src={(i.thumbUrl ?? card?.thumbUrl)!} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] bg-emerald-50" />}
                  {best && <span className="absolute left-3 top-3 rounded-full bg-wood-400 px-3 py-1 text-xs font-bold text-stone-900">AI đề xuất</span>}
                  <button type="button" onClick={() => remove(i.id)} aria-label={`Bỏ ${i.title} khỏi so sánh`}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-700 hover:text-red-700">×</button>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <Link href={`/tin/${i.id}`} className="font-semibold leading-snug hover:text-emerald-800">{i.title}</Link>
                  {card && (
                    <p className="text-sm text-stone-600">
                      <b className="text-emerald-800">{priceLabel(card)}</b> · {provinceName(card.provinceId)}
                      {card.escrow && " · Giao dịch đảm bảo"}{card.seller.isVerifiedGarden && " · Nhà vườn xác minh"}
                    </p>
                  )}
                  {ai && (
                    <div className="mt-1 space-y-2 text-sm">
                      {ai.valueScore != null && (
                        <p className="flex items-center gap-2">Đáng tiền
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100"><span className="block h-full rounded-full bg-emerald-600" style={{ width: `${ai.valueScore * 10}%` }} /></span>
                          <b>{ai.valueScore}/10</b>
                        </p>
                      )}
                      {ai.highlights.length > 0 && <ul className="space-y-1">{ai.highlights.map((h) => <li key={h} className="flex gap-1.5"><span className="text-emerald-600">+</span>{h}</li>)}</ul>}
                      {ai.concerns.length > 0 && <ul className="space-y-1 text-stone-600">{ai.concerns.map((h) => <li key={h} className="flex gap-1.5"><span className="text-red-600">−</span>{h}</li>)}</ul>}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <section className="space-y-3 rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-200 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-emerald-900"><Sparkle className="h-6 w-6 text-emerald-700" />AI so sánh <ProBadge /></h2>
            {plan?.plan.marketCompare && (
              <button type="button" onClick={run} disabled={busy || items.length < 2}
                className="cx-press inline-flex items-center gap-2 rounded-full bg-emerald-900 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300">
                <Sparkle />{busy ? "AI đang phân tích…" : items.length < 2 ? "Chọn thêm ít nhất 1 tin" : shown ? "Phân tích lại" : `So sánh ${items.length} tin`}
              </button>
            )}
          </div>
          {plan === null && <p>Vui lòng <Link href="/dang-nhap?next=/so-sanh" className="font-semibold underline">đăng nhập</Link> để dùng AI so sánh.</p>}
          {plan && !plan.plan.marketCompare && <UpgradeHint>AI so sánh giá, kích thước, tình trạng, ảnh và độ tin cậy người bán, rồi khuyên nên chọn tin nào.</UpgradeHint>}
          {error && <p role="alert" className={`rounded-2xl px-4 py-3 text-sm ${error.plan ? "bg-wood-100 text-wood-800" : "bg-red-50 text-red-800"}`}>{error.message}</p>}
          {shown && (
            <div className="space-y-3 text-[15px]">
              <AiMarkdown text={shown.verdict} />
              {shown.tips.length > 0 && (
                <div>
                  <h3 className="font-sans text-base font-bold tracking-normal text-emerald-900">Lưu ý trước khi mua</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5">{shown.tips.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              )}
              <p className="text-xs text-stone-500">AI chỉ dựa trên thông tin và ảnh trong tin; hãy hỏi người bán và xem cây trước khi trả tiền. Còn {shown.quota.remaining}/{shown.quota.limit} lượt AI hôm nay.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
