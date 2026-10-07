"use client";

import { useState } from "react";
import { api, errorText } from "@/lib/api";
import { shortVnd, vnd } from "@/lib/format";
import type { AiListingDraft, AiPriceSuggestion, MyPlan } from "@/lib/types";
import { ProBadge, Sparkle, UpgradeHint } from "./PlanGate";

const aiBtn = "cx-press inline-flex items-center gap-2 rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600";

/** "AI viết giúp": xem ảnh đã tải lên và ghi chú ngắn, viết tiêu đề + mô tả (gói Pro). */
export function AiWriteHelper({ plan, mediaIds, categoryId, hasText, onResult }: {
  plan?: MyPlan | null; mediaIds: string[]; categoryId: string; hasText: boolean; onResult: (title: string, description: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [missing, setMissing] = useState<string[]>();
  if (plan === undefined) return null;
  if (!plan?.plan.sellerAi)
    return <UpgradeHint><b>AI viết tin từ ảnh</b> (gói Xanh Pro): tải ảnh lên, AI viết sẵn tiêu đề và mô tả cho bạn sửa.</UpgradeHint>;

  async function run() {
    if (hasText && !confirm("AI sẽ thay tiêu đề và mô tả bạn đã viết. Tiếp tục?")) return;
    setBusy(true); setError(undefined);
    try {
      const r = await api<AiListingDraft>("ai/listing-draft", { method: "POST", json: { mediaIds: mediaIds.slice(0, 3), categoryId: categoryId || null, notes: notes.trim() || null } });
      onResult(r.title, r.description);
      setMissing(r.missing);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkle className="h-5 w-5 text-emerald-700" />
        <span className="font-semibold text-emerald-900">AI viết tiêu đề & mô tả từ ảnh</span>
        <ProBadge />
      </div>
      <p className="mt-1 text-sm text-stone-600">AI xem tối đa 3 ảnh đầu. Ghi thêm điều AI không thấy được (tuổi cây, nguồn gốc, cách giao…).</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Ghi chú cho AI (không bắt buộc)"
          className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-[15px] focus:border-emerald-600 focus:outline-none" />
        <button type="button" onClick={run} disabled={busy || mediaIds.length === 0} className={aiBtn}>
          <Sparkle />{busy ? "AI đang viết…" : mediaIds.length === 0 ? "Tải ảnh lên trước" : "Viết giúp tôi"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {missing && missing.length > 0 && <p className="mt-2 text-sm text-emerald-900">Nên bổ sung: {missing.join(", ")}.</p>}
    </div>
  );
}

/** "Gợi ý giá": đối chiếu tin tương tự đang bán trên chợ (gói Pro). */
export function AiPriceHelper({ plan, categoryId, title, description, attributes, mediaIds, onPick }: {
  plan?: MyPlan | null; categoryId: string; title: string; description: string; attributes: Record<string, unknown>; mediaIds: string[];
  onPick: (price: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<AiPriceSuggestion>();
  if (plan === undefined) return null;
  if (!plan?.plan.sellerAi)
    return <div className="sm:col-span-2"><UpgradeHint><b>AI gợi ý giá</b> (gói Xanh Pro) dựa trên các tin tương tự đang bán trên chợ.</UpgradeHint></div>;

  async function run() {
    setBusy(true); setError(undefined);
    try {
      setResult(await api<AiPriceSuggestion>("ai/price-suggest", {
        method: "POST", json: { categoryId, title: title.trim() || null, description: description.trim() || null, attributes, mediaIds: mediaIds.slice(0, 3) },
      }));
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold text-emerald-900"><Sparkle className="h-5 w-5 text-emerald-700" />Gợi ý giá theo chợ <ProBadge /></span>
        <button type="button" onClick={run} disabled={busy || !categoryId} className={aiBtn}>
          <Sparkle />{busy ? "Đang xem chợ…" : !categoryId ? "Chọn danh mục trước" : result ? "Gợi ý lại" : "Gợi ý giá"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {result && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {([["Thấp", result.low], ["Nên đặt", result.recommended], ["Cao", result.high]] as const).map(([label, v]) => (
              <button key={label} type="button" onClick={() => onPick(v)}
                className={`rounded-2xl px-4 py-2 text-left ring-1 ${label === "Nên đặt" ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white ring-stone-300 hover:ring-emerald-700"}`}>
                <span className="block text-xs opacity-80">{label}</span>
                <span className="font-display text-lg font-bold">{vnd(v)}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-stone-700">{result.reasoning}</p>
          <p className="text-xs text-stone-500">
            Độ tin cậy: {result.confidence || "—"}
            {result.stats ? ` · Từ ${result.stats.count} tin tương tự: ${shortVnd(result.stats.min)}–${shortVnd(result.stats.max)}, giữa ${shortVnd(result.stats.median)}` : " · Chưa có tin tương tự trên chợ"}
            {" · "}Bấm một mức giá để điền.
          </p>
        </div>
      )}
    </div>
  );
}
