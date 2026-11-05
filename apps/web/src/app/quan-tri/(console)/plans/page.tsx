"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, ListState, PageTitle, Pager, Pill, input } from "@/admin/components/ui";
import { api, errorText, formatDate, formatVnd } from "@/admin/lib/api";

interface Payment {
  id: string; userId: string; userName?: string | null; plan: string; months: number; amountVnd: number; orderCode: number; gateway: string;
  status: string; createdAt: string; paidAt?: string | null; appliedEndAt?: string | null;
}
interface Result { items: Payment[]; total: number; pageSize: number }

const STATUS: Record<string, [string, string]> = {
  Pending: ["PendingReview", "Chờ thanh toán"], Paid: ["Active", "Đã thanh toán"], Cancelled: ["Normal", "Đã hủy"], Expired: ["Rejected", "Hết hạn"],
};

export default function PlanPaymentsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ page: String(page), ...(q.trim() && { q: q.trim() }), ...(status && { status }), ...(plan && { plan }) });
      api<Result>(`admin/plans/payments?${qs}`).then((r) => { if (!cancelled) { setData(r); setError(undefined); } }, (e) => { if (!cancelled) setError(errorText(e)); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, status, plan, page]);

  return (
    <div className="max-w-6xl">
      <PageTitle title="Gói & thanh toán" subtitle={`Đối soát đơn mua Xanh Plus / Xanh Pro${data ? ` · ${data.total} đơn` : ""}`} />
      {error && <Alert>{error}</Alert>}
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Mã đơn, tên đăng nhập hoặc mã người dùng" className={`${input} w-80`} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={input}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}
        </select>
        <select value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }} className={input}>
          <option value="">Mọi gói</option><option value="Plus">Xanh Plus</option><option value="Pro">Xanh Pro</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-stone-300 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr><th>Mã đơn</th><th>Người mua</th><th>Gói</th><th className="text-right">Số tiền</th><th>Trạng thái</th><th>Tạo lúc</th><th>Thanh toán</th><th>Hiệu lực đến</th></tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id} className="border-t border-stone-100">
                <td className="font-mono text-xs">{p.orderCode}</td>
                <td><Link href={`/quan-tri/members/${p.userId}`} className="text-emerald-700 hover:underline">{p.userName ?? p.userId}</Link></td>
                <td>{p.plan} · {p.months} tháng</td>
                <td className="text-right">{formatVnd(p.amountVnd)}</td>
                <td><Pill value={STATUS[p.status]?.[0] ?? "Normal"} label={STATUS[p.status]?.[1] ?? p.status} /></td>
                <td>{formatDate(p.createdAt)}</td><td>{formatDate(p.paidAt)}</td><td>{formatDate(p.appliedEndAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ListState loading={!data && !error} empty={data?.items.length === 0} text="Không có đơn nào." />
      </div>
      {data && <Pager page={page} pages={Math.ceil(data.total / data.pageSize)} onChange={setPage} />}
    </div>
  );
}
