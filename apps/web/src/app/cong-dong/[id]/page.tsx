"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PhotoPicker, type UploadedPhoto } from "@/components/PhotoPicker";
import { Alert, btn, field } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { CommunityAuthor, MediaDto, PostType } from "@/lib/types";

interface PostDetail {
  post: {
    id: string; type: PostType; title: string; body: string; speciesIds: string[]; topics: string[]; likes: number; comments: number;
    bestCommentId?: string | null; status: string; createdAt: string; suggestListing: boolean; liked: boolean; photos: MediaDto[]; author?: CommunityAuthor;
  };
  comments: { id: string; body: string; likes: number; isBest: boolean; createdAt: string; liked: boolean; photos: MediaDto[]; author?: CommunityAuthor }[];
}

function Author({ a }: { a?: CommunityAuthor }) {
  if (!a) return null;
  return (
    <span className="text-sm">
      <b>{a.name}</b>
      {a.expert && <span className="ml-1 rounded bg-sky-50 px-1.5 py-0.5 text-xs text-sky-800">Chuyên gia{a.expertTitle ? ` · ${a.expertTitle}` : ""}</span>}
      <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800">{a.badge} · {a.points} điểm</span>
      {a.gardenSlug && <Link href={`/vuon/${a.gardenSlug}`} className="ml-1 text-xs text-emerald-700 hover:underline">Gian hàng</Link>}
    </span>
  );
}

function Photos({ photos }: { photos: MediaDto[] }) {
  if (!photos.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((m) => (
        <a key={m.id} href={m.urls.full} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.urls.card} alt="" className="aspect-square w-full rounded-xl object-cover" />
        </a>
      ))}
    </div>
  );
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<PostDetail>();
  const [me, setMe] = useState<string>();
  const [error, setError] = useState<string>();
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  const load = useCallback(() => { api<PostDetail>(`community/posts/${id}`).then(setD, (e) => setError(errorText(e))); }, [id]);
  useEffect(load, [load]);
  useEffect(() => { api<{ id: string }>("me").then((m) => setMe(m.id), () => {}); }, []);

  function handle(e: unknown) {
    if ((e as ApiError).status === 401) router.push(`/dang-nhap?next=/cong-dong/${id}`);
    else setError(errorText(e));
  }
  async function like(target: "posts" | "comments", tid: string, liked: boolean) {
    try { await api(`community/${target}/${tid}/like`, { method: liked ? "DELETE" : "PUT" }); load(); } catch (e) { handle(e); }
  }
  async function comment(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`community/posts/${id}/comments`, { method: "POST", json: { body, mediaIds: photos.map((p) => p.id) } });
      setBody(""); setPhotos([]); load();
    } catch (err) { handle(err); }
  }
  async function best(cid: string) { try { await api(`community/posts/${id}/best/${cid}`, { method: "POST" }); load(); } catch (e) { handle(e); } }
  async function report(target: "posts" | "comments", tid: string) {
    const reason = prompt("Lý do báo cáo (rao bán, spam, xúc phạm…)");
    if (!reason) return;
    try { await api(`community/${target}/${tid}/report`, { method: "POST", json: { reason } }); alert("Cảm ơn bạn đã báo cáo."); } catch (e) { handle(e); }
  }
  async function remove() {
    if (!confirm("Xóa bài này?")) return;
    try { await api(`community/posts/${id}`, { method: "DELETE" }); router.push("/cong-dong"); } catch (e) { handle(e); }
  }

  if (!d) return error ? <Alert>{error}</Alert> : <p className="text-stone-500">Đang tải…</p>;
  const p = d.post;
  const mine = me === p.author?.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/cong-dong" className="text-sm text-emerald-700 hover:underline">← Cộng đồng</Link>
      {error && <Alert>{error}</Alert>}
      {p.suggestListing && <Alert kind="warn">Bài này có vẻ đang rao bán. <Link href={`/dang-tin?title=${encodeURIComponent(p.title)}`} className="font-bold underline">Chuyển thành tin đăng</Link> để bán an toàn hơn.</Alert>}
      {p.status === "Hidden" && <Alert kind="warn">Bài đang bị ẩn chờ kiểm duyệt do có nhiều báo cáo.</Alert>}
      <article className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 text-xs">
          {p.topics.map((t) => <Link key={t} href={`/cong-dong?topic=${t}`} className="text-emerald-700 hover:underline">#{t}</Link>)}
          {p.speciesIds.map((s) => <Link key={s} href={`/cong-dong?speciesId=${s}`} className="rounded bg-stone-100 px-1.5 py-0.5">{s}</Link>)}
        </div>
        <h1 className="text-3xl leading-tight text-emerald-800">{p.title}</h1>
        <p className="text-stone-500"><Author a={p.author} /> · {timeAgo(p.createdAt)}</p>
        <div className="whitespace-pre-line text-[17px] leading-relaxed text-stone-800">{p.body}</div>
        <Photos photos={p.photos} />
        <div className="flex gap-4 text-sm">
          <button onClick={() => like("posts", p.id, p.liked)} className={p.liked ? "font-bold text-red-600" : "text-stone-600 hover:text-red-600"}>♥ {p.likes}</button>
          <button onClick={() => report("posts", p.id)} className="text-stone-500 hover:underline">Báo cáo</button>
          {mine && <button onClick={remove} className="text-red-700 hover:underline">Xóa bài</button>}
        </div>
      </article>

      <section className="space-y-3">
        <h2 className="text-2xl text-emerald-800">{p.type === "Question" ? "Câu trả lời" : "Bình luận"} ({d.comments.length})</h2>
        {d.comments.map((c) => (
          <div key={c.id} className={`space-y-2 rounded-2xl border bg-white p-4 ${c.isBest ? "border-emerald-600 ring-2 ring-emerald-100" : "border-stone-200"}`}>
            {c.isBest && <p className="text-sm font-bold text-emerald-700">✓ Câu trả lời hay nhất</p>}
            <p className="text-stone-500"><Author a={c.author} /> · {timeAgo(c.createdAt)}</p>
            <p className="whitespace-pre-line text-stone-800">{c.body}</p>
            <Photos photos={c.photos} />
            <div className="flex gap-4 text-sm">
              <button onClick={() => like("comments", c.id, c.liked)} className={c.liked ? "font-bold text-red-600" : "text-stone-600 hover:text-red-600"}>♥ {c.likes}</button>
              {mine && p.type === "Question" && !p.bestCommentId && c.author?.id !== me && <button onClick={() => best(c.id)} className="text-emerald-700 hover:underline">Chọn hay nhất</button>}
              <button onClick={() => report("comments", c.id)} className="text-stone-500 hover:underline">Báo cáo</button>
            </div>
          </div>
        ))}
        <form onSubmit={comment} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} required maxLength={3000} className={field} placeholder={p.type === "Question" ? "Chia sẻ cách xử lý của bạn…" : "Viết bình luận…"} />
          <PhotoPicker value={photos} onChange={setPhotos} max={4} kind="CommunityPhoto" />
          <button className={btn.primary}>Gửi</button>
        </form>
      </section>
    </div>
  );
}
