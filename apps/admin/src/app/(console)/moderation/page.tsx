"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, PageTitle, Pill, input } from "@/components/ui";
import { api, errorText, formatDate, formatVnd } from "@/lib/api";

interface QueueItem {
  case: { id: string; listingId: string; trigger: string; queue: string; riskScore: number; signals: string[]; slaDueAt: string; createdAt: string };
  listing?: { id: string; title: string; status: string; categoryId: string; sortPrice: number };
}

const TRIGGER: Record<string, string> = { New: "Tin mới", Edit: "Bản sửa", Report: "Bị báo cáo", RandomAudit: "Hậu kiểm", Appeal: "Khiếu nại" };

export default function ModerationQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [queue, setQueue] = useState("");
  const [trigger, setTrigger] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ ...(queue && { queue }), ...(trigger && { trigger }) });
    api<QueueItem[]>(`admin/moderation/cases?${qs}`)
      .then((r) => { if (!cancelled) { setItems(r); setError(undefined); } })
      .catch((e) => { if (!cancelled) setError(errorText(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [queue, trigger]);

  return (
    <div className="max-w-6xl">
      <PageTitle title="Kiểm duyệt tin" subtitle="Ưu tiên trước, rồi theo hạn xử lý (SLA 2 giờ trong khung 7h–22h)" />
      <div className="mb-4 flex gap-3 text-sm">
        <select value={queue} onChange={(e) => setQueue(e.target.value)} className={input}>
          <option value="">Mọi hàng chờ</option><option value="Priority">Ưu tiên</option><option value="Normal">Thường</option><option value="Audit">Hậu kiểm</option>
        </select>
        <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className={input}>
          <option value="">Mọi loại</option>
          {Object.entries(TRIGGER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr><th className="px-4 py-2">Hàng chờ</th><th className="px-4 py-2">Loại</th><th className="px-4 py-2">Tin</th>
              <th className="px-4 py-2">Giá</th><th className="px-4 py-2">Rủi ro</th><th className="px-4 py-2">Hạn SLA</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-stone-400">Đang tải…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-stone-400">Không có hồ sơ nào đang chờ 🎉</td></tr>}
            {items.map(({ case: c, listing }) => {
              const overdue = new Date(c.slaDueAt).getTime() < now;
              return (
                <tr key={c.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-4 py-2"><Pill value={c.queue} /></td>
                  <td className="px-4 py-2">{TRIGGER[c.trigger] ?? c.trigger}</td>
                  <td className="px-4 py-2">
                    <Link href={`/moderation/${c.id}`} className="font-medium text-emerald-700 hover:underline">{listing?.title ?? c.listingId}</Link>
                    <div className="text-xs text-stone-400">{c.signals.slice(0, 3).join(" · ")}</div>
                  </td>
                  <td className="px-4 py-2">{formatVnd(listing?.sortPrice)}</td>
                  <td className="px-4 py-2 font-medium">{c.riskScore}</td>
                  <td className={`px-4 py-2 ${overdue ? "font-medium text-red-700" : ""}`}>{formatDate(c.slaDueAt)}{overdue && " (quá hạn)"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
