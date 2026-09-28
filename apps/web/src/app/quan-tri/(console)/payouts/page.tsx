"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, PageTitle, btn } from "@/admin/components/ui";
import { api, errorText, formatDate, formatVnd } from "@/admin/lib/api";

interface Row { id: string; code: string; sellerId: string; status: string; total: number; refundAmount: number; payoutAmount?: number | null; payoutEligibleAt: string; settlementHold: boolean }

export default function PayoutsPage() {
  const [rows, setRows] = useState<Row[]>();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  const load = useCallback(() => { api<Row[]>("admin/escrow/payouts").then(setRows, (e) => setMsg({ kind: "err", text: errorText(e) })); }, []);
  useEffect(load, [load]);

  async function approve(r: Row) {
    if (!confirm(`Chi ${formatVnd(r.payoutAmount)} cho người bán đơn ${r.code}?`)) return;
    try {
      await api(`admin/escrow/orders/${r.id}/payout`, { method: "POST" });
      setMsg({ kind: "ok", text: `Đã quyết toán đơn ${r.code}` });
      load();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  const total = rows?.filter((r) => !r.settlementHold).reduce((s, r) => s + (r.payoutAmount ?? 0), 0) ?? 0;
  return (
    <div className="max-w-5xl">
      <PageTitle title="Quyết toán người bán" subtitle={`Đơn đã hoàn thành, qua T+1 (BR-ESC-15) · Tổng chờ chi ${formatVnd(total)}`} />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <table className="w-full rounded-lg border border-stone-200 bg-white text-sm">
        <thead className="bg-stone-50 text-left text-stone-500"><tr><th className="p-2">Đơn</th><th>Người bán</th><th className="text-right">Tổng đơn</th><th className="text-right">Đã hoàn</th><th className="text-right">Chi</th><th>Đến hạn</th><th /></tr></thead>
        <tbody>
          {rows?.map((r) => (
            <tr key={r.id} className="border-t border-stone-100">
              <td className="p-2"><Link href={`/quan-tri/escrow/${r.id}`} className="font-mono text-emerald-700">{r.code}</Link></td>
              <td className="font-mono text-xs">{r.sellerId}</td>
              <td className="text-right">{formatVnd(r.total)}</td>
              <td className="text-right">{formatVnd(r.refundAmount)}</td>
              <td className="text-right font-medium">{formatVnd(r.payoutAmount)}</td>
              <td>{formatDate(r.payoutEligibleAt)}</td>
              <td className="p-2 text-right">{r.settlementHold ? <span className="text-xs text-red-700">Tạm dừng</span> : <button onClick={() => approve(r)} className={btn.primary}>Duyệt chi</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows?.length === 0 && <p className="mt-3 text-sm text-stone-500">Không có đơn chờ quyết toán.</p>}
    </div>
  );
}
