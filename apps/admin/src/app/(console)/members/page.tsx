"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, PageTitle, Pill, input } from "@/components/ui";
import { api, errorText, formatDate } from "@/lib/api";

interface Member {
  id: string; phone: string; displayName: string; fullName?: string | null; status: string; activeViolationPoints: number; createdAt: string;
  flags: { hasVerifiedGarden: boolean; hasActivePlan: boolean; isProSeller: boolean };
}

const STATUS: Record<string, string> = { Active: "Hoạt động", Restricted: "Hạn chế", Locked: "Khóa", Banned: "Cấm vĩnh viễn", Deleted: "Đã xóa" };

export default function MembersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Member[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (status) qs.set("status", status);
      api<Member[]>(`admin/members?${qs}`).then((r) => { if (!cancelled) setRows(r); }, (e) => { if (!cancelled) setError(errorText(e)); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, status]);

  return (
    <div className="max-w-6xl">
      <PageTitle title="Người dùng" subtitle="Tra cứu theo SĐT, tên hoặc mã; xem vi phạm và xử lý (UC-ADM-04)" />
      {error && <Alert>{error}</Alert>}
      <div className="mb-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SĐT, tên hiển thị hoặc mã" className={`${input} w-72`} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <table className="w-full rounded-lg border border-stone-200 bg-white text-sm">
        <thead className="bg-stone-50 text-left text-stone-500"><tr><th className="p-2">Tên</th><th>SĐT</th><th>Loại</th><th>Trạng thái</th><th className="text-right">Điểm VP</th><th>Tham gia</th></tr></thead>
        <tbody>
          {rows?.map((m) => (
            <tr key={m.id} className="border-t border-stone-100">
              <td className="p-2"><Link href={`/members/${m.id}`} className="text-emerald-700 hover:underline">{m.displayName}</Link>{m.fullName && <span className="block text-xs text-stone-500">{m.fullName}</span>}</td>
              <td className="font-mono text-xs">{m.phone}</td>
              <td className="text-xs">{m.flags.hasVerifiedGarden ? "Nhà vườn ✓" : m.flags.isProSeller ? "Bán chuyên" : "Cá nhân"}{m.flags.hasActivePlan && " · Gói"}</td>
              <td><Pill value={m.status === "Active" ? "Active" : m.status === "Restricted" ? "PendingReview" : "Rejected"} label={STATUS[m.status] ?? m.status} /></td>
              <td className="text-right">{m.activeViolationPoints}</td>
              <td>{formatDate(m.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
