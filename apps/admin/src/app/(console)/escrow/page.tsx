"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert, PageTitle, Pill, input } from "@/components/ui";
import { api, errorText, formatDate, formatVnd } from "@/lib/api";
import { ORDER_LABEL } from "@/lib/escrow";

interface OrderRow { id: string; code: string; listingTitle: string; status: string; total: number; buyerId: string; sellerId: string; updatedAt: string; settlementHold: boolean }

export default function EscrowPage() {
  return <Suspense><EscrowList /></Suspense>;
}

function EscrowList() {
  const [status, setStatus] = useState(useSearchParams().get("status") ?? "Disputed");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<OrderRow[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (q.trim()) qs.set("q", q.trim());
    api<OrderRow[]>(`admin/escrow/orders?${qs}`).then((r) => { if (!cancelled) setRows(r); }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [status, q]);

  return (
    <div className="max-w-6xl">
      <PageTitle title="Đơn đảm bảo" subtitle="Tra cứu đơn, phân xử tranh chấp (UC-ESC-07)" />
      {error && <Alert>{error}</Alert>}
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(ORDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mã đơn" className={input} />
      </div>
      <table className="w-full rounded-lg border border-stone-200 bg-white text-sm">
        <thead className="bg-stone-50 text-left text-stone-500"><tr><th className="p-2">Mã</th><th>Tin</th><th>Trạng thái</th><th className="text-right">Tổng</th><th>Cập nhật</th></tr></thead>
        <tbody>
          {rows?.map((o) => (
            <tr key={o.id} className="border-t border-stone-100">
              <td className="p-2"><Link href={`/escrow/${o.id}`} className="font-mono text-emerald-700 hover:underline">{o.code}</Link></td>
              <td className="max-w-xs truncate">{o.listingTitle}</td>
              <td><Pill value={o.status === "Disputed" ? "Priority" : "Normal"} label={ORDER_LABEL[o.status] ?? o.status} />{o.settlementHold && <span className="ml-1 text-xs text-red-700">Tạm dừng QT</span>}</td>
              <td className="text-right">{formatVnd(o.total)}</td>
              <td>{formatDate(o.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows?.length === 0 && <p className="mt-3 text-sm text-stone-500">Không có đơn.</p>}
    </div>
  );
}
