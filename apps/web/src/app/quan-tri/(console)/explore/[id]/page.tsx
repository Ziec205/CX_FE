"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Card, PageTitle, btn, input } from "@/admin/components/ui";
import { api, errorText } from "@/admin/lib/api";

interface Photo { id: string; urls: Record<string, string> }
interface Article {
  id: string; slug: string; title: string; summary?: string | null; body?: string | null; speciesId?: string | null; tags: string[];
  status: string; publishAt?: string | null; photos?: Photo[] | null;
}

function toLocalInput(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [speciesId, setSpeciesId] = useState("");
  const [speciesList, setSpeciesList] = useState<{ id: string; commonName: string; scientificName?: string | null }[]>([]);
  useEffect(() => { api<{ id: string; commonName: string; scientificName?: string | null }[]>("species?limit=500").then(setSpeciesList, () => {}); }, []);
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("Draft");
  const [publishAt, setPublishAt] = useState(toLocalInput());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    api<Article>(`admin/explore/${id}`).then((a) => {
      if (cancelled) return;
      setTitle(a.title); setSlug(a.slug); setSummary(a.summary ?? ""); setBody(a.body ?? ""); setSpeciesId(a.speciesId ?? "");
      setTags(a.tags.join(", ")); setStatus(a.status); setPublishAt(toLocalInput(a.publishAt)); setPhotos(a.photos ?? []);
    }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [id, isNew]);

  async function upload(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 9 - photos.length)) {
      setUploading((n) => n + 1);
      const form = new FormData();
      form.append("file", f);
      try {
        const res = await fetch("/api/admin-proxy/admin/media", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw data;
        setPhotos((p) => [...p, data]);
      } catch (e) { setError(errorText(e)); }
      setUploading((n) => n - 1);
    }
  }

  const move = (i: number, dir: -1 | 1) => setPhotos((p) => {
    const n = [...p]; const j = i + dir;
    if (j < 0 || j >= n.length) return p;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  async function save(nextStatus = status) {
    setError(undefined); setOk(undefined);
    const json = {
      title, slug: slug || null, summary: summary || null, body, speciesId: speciesId || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean), status: nextStatus,
      publishAt: publishAt ? new Date(publishAt).toISOString() : null, mediaIds: photos.map((p) => p.id),
    };
    try {
      const a = await api<{ id: string; status: string; slug: string }>(isNew ? "admin/explore" : `admin/explore/${id}`, { method: isNew ? "POST" : "PUT", json });
      setStatus(a.status); setSlug(a.slug);
      setOk(nextStatus === "Published" ? (new Date(publishAt) > new Date() ? `Đã lên lịch đăng lúc ${new Date(publishAt).toLocaleString("vi-VN")}` : "Đã đăng") : "Đã lưu");
      if (isNew) router.replace(`/quan-tri/explore/${a.id}`);
    } catch (e) { setError(errorText(e)); }
  }

  async function remove() {
    if (!confirm("Xóa bài này?")) return;
    try { await api(`admin/explore/${id}`, { method: "DELETE" }); router.push("/quan-tri/explore"); } catch (e) { setError(errorText(e)); }
  }

  const paragraphs = body.split(/\n\s*\n/).filter(Boolean);
  return (
    <div className="max-w-6xl">
      <PageTitle title={isNew ? "Viết bài Khám phá" : "Sửa bài"} subtitle="Khu vực ảnh (ảnh đầu tiên là ảnh bìa) + khu vực nội dung"
        action={<Link href="/quan-tri/explore" className={btn.secondary}>← Danh sách</Link>} />
      {error && <Alert>{error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card title="Ảnh">
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.id} className="relative h-24 w-24 overflow-hidden rounded ring-1 ring-stone-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.urls.thumb} alt="" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1 text-[10px] text-white">Bìa</span>}
                  <div className="absolute bottom-0 flex w-full justify-between bg-black/50 px-1 text-xs text-white">
                    <button onClick={() => move(i, -1)} aria-label="Lên">◀</button>
                    <button onClick={() => setPhotos(photos.filter((x) => x.id !== p.id))} aria-label="Xóa">✕</button>
                    <button onClick={() => move(i, 1)} aria-label="Xuống">▶</button>
                  </div>
                </div>
              ))}
              {uploading > 0 && <div className="flex h-24 w-24 items-center justify-center rounded bg-stone-100 text-xs">Đang tải…</div>}
              {photos.length < 9 && (
                <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded border-2 border-dashed border-stone-300 text-xs text-stone-500">
                  + Ảnh
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
          </Card>
          <Card title="Nội dung">
            <div className="space-y-3 text-sm">
              <label className="block">Tiêu đề (5–150 ký tự)<input value={title} onChange={(e) => setTitle(e.target.value)} className={`${input} mt-1 w-full`} /></label>
              <label className="block">Đường dẫn (để trống = tự tạo từ tiêu đề)<input value={slug} onChange={(e) => setSlug(e.target.value)} className={`${input} mt-1 w-full`} placeholder="cay-ngoc-ngan-thai" /></label>
              <label className="block">Tóm tắt (≤ 300 ký tự)<input value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} className={`${input} mt-1 w-full`} /></label>
              <label className="block">Nội dung (đoạn cách nhau bằng 1 dòng trống)<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className={`${input} mt-1 w-full`} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">Loài cây (Thư viện)
                  <select value={speciesId} onChange={(e) => setSpeciesId(e.target.value)} className={`${input} mt-1 w-full`}>
                    <option value="">— Không gắn loài —</option>
                    {/* Bài cũ gắn mã loài không còn trong Thư viện: vẫn hiện để không mất dữ liệu. */}
                    {speciesId && !speciesList.some((s) => s.id === speciesId) && <option value={speciesId}>{speciesId}</option>}
                    {speciesList.map((s) => <option key={s.id} value={s.id}>{s.commonName}{s.scientificName ? ` (${s.scientificName})` : ""}</option>)}
                  </select>
                </label>
                <label className="block">Thẻ (cách nhau dấu phẩy)<input value={tags} onChange={(e) => setTags(e.target.value)} className={`${input} mt-1 w-full`} /></label>
              </div>
            </div>
          </Card>
          <Card title="Đăng bài">
            <div className="flex flex-wrap items-end gap-2 text-sm">
              <label className="block">Hiện từ lúc<input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className={`${input} mt-1 block`} /></label>
              <button onClick={() => save("Draft")} className={btn.secondary}>Lưu nháp</button>
              <button onClick={() => save("Published")} className={btn.primary}>{new Date(publishAt) > new Date() ? "Lên lịch đăng" : "Đăng ngay"}</button>
              {status === "Published" && <button onClick={() => save("Archived")} className={btn.secondary}>Gỡ xuống</button>}
              {!isNew && <button onClick={remove} className={btn.danger}>Xóa</button>}
            </div>
          </Card>
        </div>

        <Card title="Xem trước ở trang chủ">
          <div className="overflow-hidden rounded-2xl border border-stone-200">
            {photos[0]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photos[0].urls.card} alt="" className="aspect-[4/3] w-full object-cover" />
              : <div className="flex aspect-[4/3] items-center justify-center bg-stone-100 text-stone-400">Khu vực ảnh</div>}
            <div className="space-y-2 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Cây ít người biết</p>
              <h3 className="text-2xl text-emerald-800">{title || "Tiêu đề bài"}</h3>
              {summary && <p className="italic text-stone-600">{summary}</p>}
              {paragraphs.slice(0, 3).map((p, i) => <p key={i} className="text-sm text-stone-700">{p}</p>)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
