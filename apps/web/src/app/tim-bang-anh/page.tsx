"use client";

import Link from "next/link";
import { useState } from "react";
import { ListingCardView } from "@/components/ListingCardView";
import { Alert } from "@/components/ui";
import { errorText, type ApiError } from "@/lib/api";
import type { ListingCard } from "@/lib/types";

interface Result {
  identify: { requestId: string; recognized: boolean; suggestions: { speciesId: string; commonName: string; scientificName?: string; confidence: number }[]; message?: string };
  listings: ListingCard[];
}

export default function ImageSearchPage() {
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState<string>();

  async function search(file?: File) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setBusy(true); setError(undefined); setResult(undefined);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/proxy/search/by-image", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw { message: data?.message ?? "Không nhận diện được ảnh", status: res.status } as ApiError;
      setResult(data);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  const top = result?.identify.suggestions[0];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl tracking-tight text-emerald-800">Tìm bằng ảnh</h1>
        <p className="mt-1 text-stone-600">Chụp cây bạn thấy ngoài đường hay nhà bạn bè — Chạm Xanh gợi ý tên loài và tin đang bán.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="cursor-pointer rounded-full bg-emerald-800 px-6 py-3 font-bold text-stone-50 hover:bg-emerald-700">
          Chụp / chọn ảnh
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { search(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Ảnh đã chọn" className="h-24 w-24 rounded-xl object-cover" />
        )}
        {busy && <span className="text-stone-500">Đang nhận diện…</span>}
      </div>
      {error && <Alert>{error}</Alert>}
      {result && !result.identify.recognized && <Alert kind="warn">{result.identify.message ?? "Chưa nhận ra loài cây này."} Thử chụp rõ lá và thân hơn, hoặc <Link href="/tim-kiem" className="underline">tìm theo tên</Link>.</Alert>}
      {top && (
        <div className="space-y-2">
          <p className="text-lg">Có thể là: <b className="text-emerald-800">{top.commonName}</b>{top.scientificName && <i className="ml-1 text-stone-500">({top.scientificName})</i>} · {Math.round(top.confidence * 100)}%</p>
          {result!.identify.suggestions.length > 1 && (
            <p className="text-sm text-stone-600">Hoặc: {result!.identify.suggestions.slice(1).map((s) => (
              <Link key={s.speciesId} href={`/tim-kiem?speciesId=${s.speciesId}`} className="mr-2 text-emerald-700 underline">{s.commonName}</Link>
            ))}</p>
          )}
        </div>
      )}
      {result && result.listings.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.listings.map((l) => <ListingCardView key={l.id} l={l} />)}
        </div>
      )}
      {top && result?.listings.length === 0 && <p className="text-stone-500">Chưa có tin đang bán loài này. <Link href={`/tim-kiem?speciesId=${top.speciesId}`} className="text-emerald-700 underline">Lưu tìm kiếm</Link> để được báo khi có.</p>}
    </div>
  );
}
