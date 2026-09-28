"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/admin/components/StatusBadge";
import { api, formatDate, type ApiError, type PriceBook } from "@/admin/lib/pricing";

export default function PricingListPage() {
  const router = useRouter();
  const [books, setBooks] = useState<PriceBook[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<PriceBook[]>("admin/price-books")
      .then((b) => { if (!cancelled) { setBooks(b); setError(undefined); } })
      .catch((e: ApiError) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function createDraft(sourceVersion?: number) {
    try {
      const draft = await api<PriceBook>("admin/price-books", {
        method: "POST",
        body: JSON.stringify({ sourceVersion: sourceVersion ?? null }),
      });
      router.push(`/quan-tri/pricing/${draft.id}`);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  const active = books.find((b) => b.status === "Active");

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bảng giá & phí</h1>
          <p className="text-sm text-stone-500">
            {active ? `Đang hiệu lực: v${active.version} từ ${formatDate(active.effectiveFrom)}` : "Chưa có bảng giá hiệu lực"}
          </p>
        </div>
        <button onClick={() => createDraft()} className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          + Tạo phiên bản mới
        </button>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr>
              <th className="px-4 py-2">Phiên bản</th><th className="px-4 py-2">Trạng thái</th>
              <th className="px-4 py-2">Hiệu lực từ</th><th className="px-4 py-2">Người soạn</th>
              <th className="px-4 py-2">Người duyệt</th><th className="px-4 py-2">Ghi chú</th><th />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-stone-400">Đang tải…</td></tr>}
            {books.map((b) => (
              <tr key={b.id} className="border-t border-stone-100">
                <td className="px-4 py-2 font-medium"><Link href={`/quan-tri/pricing/${b.id}`} className="text-emerald-700 hover:underline">v{b.version}</Link></td>
                <td className="px-4 py-2"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-2">{formatDate(b.effectiveFrom)}</td>
                <td className="px-4 py-2">{b.createdBy}</td>
                <td className="px-4 py-2">{b.approvedBy ?? "—"}</td>
                <td className="px-4 py-2 text-stone-500">{b.changeNote ?? b.rejectReason ?? ""}</td>
                <td className="px-4 py-2 text-right">
                  {(b.status === "Expired" || b.status === "Active") && (
                    <button onClick={() => createDraft(b.version)} className="text-xs text-stone-500 hover:text-emerald-700">Khôi phục</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
