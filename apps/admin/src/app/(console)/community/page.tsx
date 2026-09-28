"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Card, PageTitle, Pill, btn } from "@/components/ui";
import { api, errorText, formatDate } from "@/lib/api";

interface Post { id: string; type: string; title: string; body: string; authorId: string; status: string; reportCount: number; saleFlag: boolean; createdAt: string }
interface Comment { id: string; postId: string; body: string; authorId: string; status: string; reportCount: number; createdAt: string }

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export default function CommunityAdminPage() {
  const [data, setData] = useState<{ posts: Post[]; comments: Comment[] }>();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  const load = useCallback(() => { api<{ posts: Post[]; comments: Comment[] }>("admin/community/reported").then(setData, (e) => setMsg({ kind: "err", text: errorText(e) })); }, []);
  useEffect(load, [load]);

  async function moderate(kind: "posts" | "comments", id: string, status: "Visible" | "Removed") {
    const reason = status === "Removed" ? prompt("Lý do gỡ") : null;
    if (status === "Removed" && !reason) return;
    try {
      await api(`admin/community/${kind}/${id}/moderate`, { method: "POST", json: { status, reason } });
      setMsg({ kind: "ok", text: status === "Visible" ? "Đã khôi phục" : "Đã gỡ" }); load();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  return (
    <div className="max-w-5xl space-y-4">
      <PageTitle title="Cộng đồng" subtitle="Bài/bình luận bị báo cáo (≥ 3 báo cáo tự ẩn chờ xử lý — BR-COM-02)" />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <Card title={`Bài viết (${data?.posts.length ?? 0})`}>
        <ul className="divide-y divide-stone-100">
          {data?.posts.map((p) => (
            <li key={p.id} className="space-y-1 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <a href={`${WEB_URL}/cong-dong/${p.id}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">{p.title}</a>
                <Pill value={p.status === "Hidden" ? "TempHidden" : "Normal"} label={p.status} />
                <span className="text-xs text-red-700">{p.reportCount} báo cáo</span>
                {p.saleFlag && <span className="text-xs text-amber-700">Nghi rao bán</span>}
              </div>
              <p className="line-clamp-2 text-stone-600">{p.body}</p>
              <p className="text-xs text-stone-500">{p.authorId} · {formatDate(p.createdAt)}</p>
              <div className="flex gap-2">
                <button onClick={() => moderate("posts", p.id, "Visible")} className={btn.secondary}>Giữ lại</button>
                <button onClick={() => moderate("posts", p.id, "Removed")} className={btn.danger}>Gỡ bài</button>
              </div>
            </li>
          ))}
        </ul>
        {data?.posts.length === 0 && <p className="text-sm text-stone-500">Không có.</p>}
      </Card>
      <Card title={`Bình luận (${data?.comments.length ?? 0})`}>
        <ul className="divide-y divide-stone-100">
          {data?.comments.map((c) => (
            <li key={c.id} className="space-y-1 py-3 text-sm">
              <p className="whitespace-pre-line">{c.body}</p>
              <p className="text-xs text-stone-500">{c.authorId} · {c.reportCount} báo cáo · {c.status} · <a href={`${WEB_URL}/cong-dong/${c.postId}`} target="_blank" rel="noreferrer" className="underline">xem bài</a></p>
              <div className="flex gap-2">
                <button onClick={() => moderate("comments", c.id, "Visible")} className={btn.secondary}>Giữ lại</button>
                <button onClick={() => moderate("comments", c.id, "Removed")} className={btn.danger}>Gỡ</button>
              </div>
            </li>
          ))}
        </ul>
        {data?.comments.length === 0 && <p className="text-sm text-stone-500">Không có.</p>}
      </Card>
    </div>
  );
}
