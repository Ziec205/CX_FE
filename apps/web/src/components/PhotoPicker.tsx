"use client";

import { useState } from "react";
import { errorText, uploadPhoto } from "@/lib/api";

export interface UploadedPhoto { id: string; preview: string }

/** Chọn ảnh từ thư viện hoặc chụp bằng camera (ảnh chụp trong app được gắn nhãn "ảnh chụp thực tế"). camera=false: chỉ còn ô thêm ảnh. */
export function PhotoPicker({ value, onChange, max = 12, kind = "ListingPhoto", label = "Thêm ảnh", camera = true }: {
  value: UploadedPhoto[]; onChange: (v: UploadedPhoto[]) => void; max?: number; kind?: string; label?: string; camera?: boolean;
}) {
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string>();

  async function add(files: FileList | null, fromCamera: boolean) {
    if (!files) return;
    setError(undefined);
    const list = Array.from(files).slice(0, max - value.length);
    setBusy((b) => b + list.length);
    let next = [...value];
    for (const f of list) {
      try {
        const r = await uploadPhoto(f, kind, fromCamera);
        next = [...next, { id: r.id, preview: r.urls?.thumb ?? URL.createObjectURL(f) }];
        onChange(next);
      } catch (e) { setError(errorText(e)); }
      setBusy((b) => b - 1);
    }
  }

  const move = (i: number) => { const n = [...value]; [n[0], n[i]] = [n[i], n[0]]; onChange(n); };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((p, i) => (
          <div key={p.id} className="relative h-24 w-24 overflow-hidden rounded-lg ring-1 ring-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="h-full w-full object-cover" />
            {i === 0 ? <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1 text-[10px] text-white">Ảnh bìa</span>
              : <button type="button" onClick={() => move(i)} className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[10px]">Làm bìa</button>}
            <button type="button" aria-label="Xóa ảnh" onClick={() => onChange(value.filter((x) => x.id !== p.id))} className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white">×</button>
          </div>
        ))}
        {busy > 0 && <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-stone-100 text-xs text-stone-500">Đang tải {busy}…</div>}
        {value.length < max && (
          <>
            {camera && (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-emerald-400 text-xs text-emerald-700">
                Chụp ảnh
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { add(e.target.files, true); e.target.value = ""; }} />
              </label>
            )}
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-xs text-stone-600">
              {label}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { add(e.target.files, false); e.target.value = ""; }} />
            </label>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
