"use client";

import { useState } from "react";

export function Gallery({ urls, title }: { urls: string[]; title: string }) {
  const [i, setI] = useState(0);
  if (urls.length === 0) return <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-emerald-300" />;
  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl bg-stone-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[i]} alt={`${title} — ảnh ${i + 1}`} className="mx-auto aspect-[4/3] max-h-[520px] w-full object-contain" />
        {urls.length > 1 && (
          <>
            <button aria-label="Ảnh trước" onClick={() => setI((i - 1 + urls.length) % urls.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-lg">‹</button>
            <button aria-label="Ảnh sau" onClick={() => setI((i + 1) % urls.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-lg">›</button>
            <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{i + 1}/{urls.length}</span>
          </>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {urls.map((u, idx) => (
          <button key={u} onClick={() => setI(idx)} className={`shrink-0 overflow-hidden rounded-lg ring-2 ${idx === i ? "ring-emerald-500" : "ring-transparent"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u.replace("/full.webp", "/thumb.webp")} alt="" className="h-16 w-16 object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
