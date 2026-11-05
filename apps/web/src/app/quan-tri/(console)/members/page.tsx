"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, ListState, PageTitle, Pill, btn, input } from "@/admin/components/ui";
import { api, errorText, formatDate } from "@/admin/lib/api";

interface Member {
  id: string; username?: string | null; phone?: string | null; displayName: string; fullName?: string | null; status: string; activeViolationPoints: number; createdAt: string;
}

const STATUS: Record<string, string> = { Active: "Hoạt động", Restricted: "Hạn chế", Locked: "Khóa", Banned: "Cấm vĩnh viễn", Deleted: "Đã xóa" };

export default function MembersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Member[]>();
  const [error, setError] = useState<string>();
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (status) qs.set("status", status);
      qs.set("page", String(page));
      api<Member[]>(`admin/members?${qs}`).then((r) => { if (!cancelled) setRows(r); }, (e) => { if (!cancelled) setError(errorText(e)); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, status, page]);

  return (
    <div className="max-w-6xl">
      <PageTitle title="Người dùng" subtitle="Tra cứu theo tên đăng nhập, SĐT, tên hoặc mã; xem vi phạm và xử lý (UC-ADM-04)" />
      {error && <Alert>{error}</Alert>}
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tên đăng nhập, SĐT, tên hoặc mã" className={`${input} w-72`} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={input}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto"><table className="w-full rounded-2xl border border-stone-300 bg-white text-sm">
        <thead className="bg-stone-50 text-left text-stone-500"><tr><th className="p-2">Tên</th><th>SĐT</th><th>Trạng thái</th><th className="text-right">Điểm VP</th><th>Tham gia</th></tr></thead>
        <tbody>
          {rows?.map((m) => (
            <tr key={m.id} className="border-t border-stone-100">
              <td className="p-2"><Link href={`/quan-tri/members/${m.id}`} className="text-emerald-700 hover:underline">{m.displayName}</Link>{m.username && <span className="block text-xs text-stone-500">@{m.username}</span>}{m.fullName && <span className="block text-xs text-stone-500">{m.fullName}</span>}</td>
              <td className="font-mono text-xs">{m.phone ?? "—"}</td>
              <td><Pill value={m.status === "Active" ? "Active" : m.status === "Restricted" ? "PendingReview" : "Rejected"} label={STATUS[m.status] ?? m.status} /></td>
              <td className="text-right">{m.activeViolationPoints}</td>
              <td>{formatDate(m.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <ListState loading={!rows && !error} empty={rows?.length === 0} text="Không tìm thấy người dùng." />
      <div className="mt-3 flex items-center justify-center gap-3 text-sm">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className={btn.secondary}>← Trước</button>
        <span>Trang {page}</span>
        <button disabled={(rows?.length ?? 0) < 50} onClick={() => setPage(page + 1)} className={btn.secondary}>Sau →</button>
      </div>
    </div>
  );
}
