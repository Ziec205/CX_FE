"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoPicker, type UploadedPhoto } from "@/components/PhotoPicker";
import { SpeciesPicker, type PickedSpecies } from "@/components/SpeciesPicker";
import { Alert, Label, btn, field } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import type { PostType } from "@/lib/types";

const TYPES: [PostType, string, string][] = [
  ["Question", "Hỏi đáp", "Cây bị bệnh, cách chăm, nên trồng gì…"],
  ["Showcase", "Khoe cây", "Ảnh cây, quá trình tạo dáng bonsai"],
  ["Guide", "Kinh nghiệm", "Bài hướng dẫn chi tiết"],
];

export default function NewPostPage() {
  const router = useRouter();
  const [type, setType] = useState<PostType>("Question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [species, setSpecies] = useState<PickedSpecies>();
  const [topics, setTopics] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [error, setError] = useState<string>();
  const [saleHint, setSaleHint] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    try {
      const r = await api<{ id: string; suggestListing: boolean }>("community/posts", {
        method: "POST",
        json: { type, title, body, mediaIds: photos.map((p) => p.id), speciesIds: species ? [species.id] : [], topics: topics.split(",").map((t) => t.trim()).filter(Boolean) },
      });
      if (r.suggestListing) setSaleHint(r.id);
      else router.push(`/cong-dong/${r.id}`);
    } catch (err) {
      if ((err as ApiError).status === 401) router.push("/dang-nhap?next=/cong-dong/dang-bai");
      else setError(errorText(err));
    } finally { setBusy(false); }
  }

  if (saleHint)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Alert kind="warn">Bài của bạn có vẻ đang rao bán (có giá hoặc “inbox giá”). Cộng đồng không cho rao bán — chuyển thành tin đăng để người mua tìm thấy và liên hệ an toàn hơn.</Alert>
        <div className="flex gap-2">
          <Link href={`/dang-tin?title=${encodeURIComponent(title)}`} className={btn.primary}>Chuyển thành tin đăng</Link>
          <Link href={`/cong-dong/${saleHint}`} className={btn.secondary}>Giữ bài trong cộng đồng</Link>
        </div>
      </div>
    );

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-4xl tracking-tight text-emerald-800">Đăng bài cộng đồng</h1>
      <div className="grid gap-2 sm:grid-cols-3">
        {TYPES.map(([t, label, hint]) => (
          <button key={t} type="button" onClick={() => setType(t)} className={`rounded-xl border p-3 text-left ${type === t ? "border-emerald-600 bg-emerald-50" : "border-stone-200 bg-white"}`}>
            <b>{label}</b><span className="block text-sm text-stone-600">{hint}</span>
          </button>
        ))}
      </div>
      <Label text="Tiêu đề" required><input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={5} maxLength={150} className={field} placeholder={type === "Question" ? "Vd: Trầu bà bị vàng lá phải làm sao?" : ""} /></Label>
      <Label text="Nội dung" required><textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} rows={type === "Guide" ? 14 : 6} className={field} /></Label>
      <Label text="Ảnh" hint={type === "Showcase" ? "Bài khoe cây cần ít nhất 1 ảnh" : undefined}><PhotoPicker value={photos} onChange={setPhotos} max={10} kind="CommunityPhoto" /></Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label text="Loài cây liên quan"><SpeciesPicker value={species} onChange={setSpecies} /></Label>
        <Label text="Chủ đề" hint="Cách nhau bằng dấu phẩy: bonsai, sen đá, sân thượng"><input value={topics} onChange={(e) => setTopics(e.target.value)} className={field} /></Label>
      </div>
      {error && <Alert>{error}</Alert>}
      <button disabled={busy} className={btn.primary}>{busy ? "Đang đăng…" : "Đăng bài"}</button>
    </form>
  );
}
