"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, ListState, PageTitle, Pager, Pill, btn, input } from "@/admin/components/ui";
import { api, errorText, formatDate } from "@/admin/lib/api";

interface ArticleRow {
  id: string; slug: string; title: string; summary?: string | null; speciesId?: string | null; tags?: string[]; status: string; publishAt?: string | null; views: number;
  cover?: { urls: Record<string, string> } | null;
}

const STATUS_LABEL: Record<string, string> = { Draft: "Nháp", Published: "Đã đăng", Archived: "Lưu trữ" };

export default function ExploreAdminPage() {
  const [rows, setRows] = useState<ArticleRow[]>();
  const [error, setError] = useState<string>();
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [noSpecies, setNoSpecies] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    api<ArticleRow[]>("admin/explore").then((r) => { if (!cancelled) setRows(r); }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, []);

  const [now] = useState(() => Date.now());
  const scheduled = rows?.filter((r) => r.status === "Published" && r.publishAt && new Date(r.publishAt).getTime() > now).length ?? 0;

  const filtered = rows?.filter((r) => (!fStatus || r.status === fStatus) && (!noSpecies || !r.speciesId) && r.title.toLowerCase().includes(q.trim().toLowerCase())) ?? [];
  const PAGE = 20;
  const shown = filtered.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="max-w-5xl">
      <PageTitle title="Khám phá" subtitle={`Bài giới thiệu cây ít người biết, hiện ở trang chủ mỗi ngày · ${scheduled} bài đã lên lịch`}
        action={<Link href="/quan-tri/explore/new" className={btn.primary}>+ Viết bài</Link>} />
      {error && <Alert>{error}</Alert>}
      {scheduled === 0 && rows && <Alert kind="warn">Chưa có bài nào lên lịch cho những ngày tới. Trang chủ sẽ tiếp tục hiện bài mới nhất.</Alert>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm theo tiêu đề" className={`${input} w-64`} />
        <select value={fStatus} onChange={(e) => { setFStatus(e.target.value); setPage(1); }} className={input}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={noSpecies} onChange={(e) => { setNoSpecies(e.target.checked); setPage(1); }} /> Chưa gắn loài</label>
      </div>
      <div className="overflow-x-auto"><table className="w-full rounded-2xl border border-stone-300 bg-white text-sm">
        <thead className="bg-stone-50 text-left text-stone-500">
          <tr><th className="p-2">Bài</th><th>Loài</th><th>Trạng thái</th><th>Ngày hiện</th><th className="text-right">Lượt xem</th><th /></tr>
        </thead>
        <tbody>
          {shown.map((r) => {
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
                <td>{r.speciesId ? <span className="text-xs">{r.speciesId}</span> : <span className="text-xs text-amber-700">Chưa gắn</span>}</td>
                <td><Pill value={r.status === "Published" ? (future ? "Submitted" : "Active") : "Normal"} label={r.status === "Published" && future ? "Đã lên lịch" : STATUS_LABEL[r.status]} /></td>
                <td>{formatDate(r.publishAt)}</td>
                <td className="text-right">{r.views}</td>
                <td className="p-2 text-right"><Link href={`/quan-tri/explore/${r.id}`} className="text-emerald-700 hover:underline">Sửa</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      <ListState loading={!rows && !error} empty={!!rows && filtered.length === 0} text="Không có bài phù hợp." />
      <Pager page={page} pages={Math.ceil(filtered.length / PAGE)} onChange={setPage} />
    </div>
  );
}
