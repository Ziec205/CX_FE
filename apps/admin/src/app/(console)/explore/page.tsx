"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, PageTitle, Pill, btn } from "@/components/ui";
import { api, errorText, formatDate } from "@/lib/api";

interface ArticleRow {
  id: string; slug: string; title: string; summary?: string | null; status: string; publishAt?: string | null; views: number;
  cover?: { urls: Record<string, string> } | null;
}

const STATUS_LABEL: Record<string, string> = { Draft: "Nháp", Published: "Đã đăng", Archived: "Lưu trữ" };

export default function ExploreAdminPage() {
  const [rows, setRows] = useState<ArticleRow[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    api<ArticleRow[]>("admin/explore").then((r) => { if (!cancelled) setRows(r); }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, []);

  const [now] = useState(() => Date.now());
  const scheduled = rows?.filter((r) => r.status === "Published" && r.publishAt && new Date(r.publishAt).getTime() > now).length ?? 0;

  return (
    <div className="max-w-5xl">
      <PageTitle title="Khám phá" subtitle={`Bài giới thiệu cây ít người biết, hiện ở trang chủ mỗi ngày · ${scheduled} bài đã lên lịch`}
        action={<Link href="/explore/new" className={btn.primary}>+ Viết bài</Link>} />
      {error && <Alert>{error}</Alert>}
      {scheduled === 0 && rows && <Alert kind="warn">Chưa có bài nào lên lịch cho những ngày tới. Trang chủ sẽ tiếp tục hiện bài mới nhất.</Alert>}
      <table className="w-full rounded-lg border border-stone-200 bg-white text-sm">
        <thead className="bg-stone-50 text-left text-stone-500">
          <tr><th className="p-2">Bài</th><th>Trạng thái</th><th>Ngày hiện</th><th className="text-right">Lượt xem</th><th /></tr>
        </thead>
        <tbody>
          {rows?.map((r) => {
            const future = r.publishAt && new Date(r.publishAt).getTime() > now;
            return (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="flex items-center gap-2 p-2">
                  {r.cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={r.cover.urls.thumb} alt="" className="h-10 w-10 rounded object-cover" />
                    : <div className="h-10 w-10 rounded bg-stone-100" />}
                  <span className="font-medium">{r.title}</span>
                </td>
                <td><Pill value={r.status === "Published" ? (future ? "Submitted" : "Active") : "Normal"} label={r.status === "Published" && future ? "Đã lên lịch" : STATUS_LABEL[r.status]} /></td>
                <td>{formatDate(r.publishAt)}</td>
                <td className="text-right">{r.views}</td>
                <td className="p-2 text-right"><Link href={`/explore/${r.id}`} className="text-emerald-700 hover:underline">Sửa</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
