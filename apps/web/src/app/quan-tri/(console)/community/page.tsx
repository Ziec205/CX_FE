"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Card, ListState, PageTitle, Pager, Pill, btn, input } from "@/admin/components/ui";
import { api, errorText, formatDate } from "@/admin/lib/api";

type Status = "Visible" | "Hidden" | "Removed";
interface Post { id: string; type: string; title: string; body: string; authorId: string; authorName?: string | null; status: string; reportCount: number; saleFlag: boolean; createdAt: string }
interface Comment { id: string; postId: string; body: string; authorId: string; status: string; reportCount: number; createdAt: string }
interface PostPage { items: Post[]; total: number; pageSize: number }

const LABEL: Record<string, [string, string]> = { Visible: ["Active", "Đang hiện"], Hidden: ["TempHidden", "Đang ẩn"], Removed: ["Removed", "Đã gỡ"] };
const CONFIRM: Record<Status, string> = { Visible: "", Hidden: "Lý do ẩn", Removed: "Lý do gỡ" };

function Row({ post, onModerate }: { post: Post; onModerate: (id: string, s: Status) => void }) {
  return (
    <li className="space-y-1 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <a href={`/cong-dong/${post.id}`} target="_blank" rel="noreferrer" className="font-bold hover:underline">{post.title}</a>
        <Pill value={LABEL[post.status]?.[0] ?? "Normal"} label={LABEL[post.status]?.[1] ?? post.status} />
        {post.reportCount > 0 && <span className="text-xs text-red-700">{post.reportCount} báo cáo</span>}
        {post.saleFlag && <span className="text-xs text-amber-700">Nghi rao bán</span>}
      </div>
      <p className="line-clamp-2 text-stone-600">{post.body}</p>
      <p className="text-xs text-stone-500"><Link href={`/quan-tri/members/${post.authorId}`} className="underline">{post.authorName ?? post.authorId}</Link> · {formatDate(post.createdAt)}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {post.status !== "Visible" || post.reportCount > 0 ? <button onClick={() => onModerate(post.id, "Visible")} className={btn.secondary}>{post.status === "Visible" ? "Giữ lại" : "Hiện lại"}</button> : null}
        {post.status === "Visible" && <button onClick={() => onModerate(post.id, "Hidden")} className={btn.secondary}>Ẩn</button>}
        {post.status !== "Removed" && <button onClick={() => onModerate(post.id, "Removed")} className={btn.danger}>Gỡ bài</button>}
      </div>
    </li>
  );
}

export default function CommunityAdminPage() {
  const [tab, setTab] = useState<"reported" | "all">("reported");
  const [reported, setReported] = useState<{ posts: Post[]; comments: Comment[] }>();
  const [all, setAll] = useState<PostPage>();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  const fail = useCallback((e: unknown) => setMsg({ kind: "err", text: errorText(e) }), []);

  useEffect(() => {
    let cancelled = false;
    if (tab === "reported") {
      api<{ posts: Post[]; comments: Comment[] }>("admin/community/reported").then((r) => { if (!cancelled) setReported(r); }, fail);
      return () => { cancelled = true; };
    }
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ page: String(page), ...(q.trim() && { q: q.trim() }), ...(status && { status }) });
      api<PostPage>(`admin/community/posts?${qs}`).then((r) => { if (!cancelled) setAll(r); }, fail);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [tab, q, status, page, tick, fail]);

  async function moderate(kind: "posts" | "comments", id: string, next: Status) {
    const reason = next === "Visible" ? null : prompt(CONFIRM[next]);
    if (next !== "Visible" && !reason?.trim()) return;
    try {
      await api(`admin/community/${kind}/${id}/moderate`, { method: "POST", json: { status: next, reason } });
      setMsg({ kind: "ok", text: next === "Visible" ? "Đã hiện lại" : next === "Hidden" ? "Đã ẩn" : "Đã gỡ" });
      setTick((x) => x + 1);
    } catch (e) { fail(e); }
  }

  const tabCls = (on: boolean) => `rounded-full px-4 py-2 text-sm font-medium ${on ? "bg-[#2d5a27] text-white" : "bg-[#c9e8bf] text-[#4f6a49]"}`;

  return (
    <div className="max-w-5xl space-y-4">
      <PageTitle title="Cộng đồng" subtitle="Duyệt bài bị báo cáo (≥ 3 báo cáo tự ẩn chờ xử lý) và tìm bài để ẩn/gỡ" />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="flex gap-2">
        <button onClick={() => setTab("reported")} className={tabCls(tab === "reported")}>Bị báo cáo</button>
        <button onClick={() => setTab("all")} className={tabCls(tab === "all")}>Tất cả bài{all ? ` (${all.total})` : ""}</button>
      </div>

      {tab === "reported" && (
        <>
          <Card title={`Bài viết (${reported?.posts.length ?? 0})`}>
            <ul className="divide-y divide-stone-100">{reported?.posts.map((p) => <Row key={p.id} post={p} onModerate={(id, s) => moderate("posts", id, s)} />)}</ul>
            <ListState loading={!reported && !msg} empty={reported?.posts.length === 0} text="Không có bài bị báo cáo." />
          </Card>
          <Card title={`Bình luận (${reported?.comments.length ?? 0})`}>
            <ul className="divide-y divide-stone-100">
              {reported?.comments.map((c) => (
                <li key={c.id} className="space-y-1 py-3 text-sm">
                  <p className="whitespace-pre-line">{c.body}</p>
                  <p className="text-xs text-stone-500"><Link href={`/quan-tri/members/${c.authorId}`} className="underline">Người viết</Link> · {c.reportCount} báo cáo · {LABEL[c.status]?.[1] ?? c.status} · <a href={`/cong-dong/${c.postId}`} target="_blank" rel="noreferrer" className="underline">xem bài</a></p>
                  <div className="flex gap-2">
                    <button onClick={() => moderate("comments", c.id, "Visible")} className={btn.secondary}>Giữ lại</button>
                    <button onClick={() => moderate("comments", c.id, "Removed")} className={btn.danger}>Gỡ</button>
                  </div>
                </li>
              ))}
            </ul>
            <ListState loading={!reported && !msg} empty={reported?.comments.length === 0} text="Không có bình luận bị báo cáo." />
          </Card>
        </>
      )}

      {tab === "all" && (
        <Card>
          <div className="mb-2 flex flex-wrap gap-2">
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm theo tiêu đề" className={`${input} w-72`} />
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={input}>
              <option value="">Mọi trạng thái</option>
              {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}
            </select>
          </div>
          <ul className="divide-y divide-stone-100">{all?.items.map((p) => <Row key={p.id} post={p} onModerate={(id, s) => moderate("posts", id, s)} />)}</ul>
          <ListState loading={!all && !msg} empty={all?.items.length === 0} text="Không có bài nào." />
          {all && <Pager page={page} pages={Math.ceil(all.total / all.pageSize)} onChange={setPage} />}
        </Card>
      )}
    </div>
  );
}
