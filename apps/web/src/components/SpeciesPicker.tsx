"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Species } from "@/lib/types";
import { field } from "./ui";

export interface PickedSpecies { id: string; name: string }

/** Ô tìm loài trong Thư viện (tìm không dấu, tên khác). */
export function SpeciesPicker({ value, onChange, placeholder = "Tìm loài: trầu bà, sen đá…" }: {
  value?: PickedSpecies; onChange: (v?: PickedSpecies) => void; placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Species[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api<Species[]>(`species?q=${encodeURIComponent(q)}&limit=8`).then((r) => { if (!cancelled) setList(r); }, () => {});
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  if (value)
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800">{value.name}</span>
        <button type="button" onClick={() => onChange(undefined)} className="text-sm text-stone-500 hover:text-red-700">Đổi</button>
      </div>
    );

  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className={field} />
      {q.trim().length >= 2 && list.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-stone-200 bg-white shadow-lg">
          {list.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => { onChange({ id: s.id, name: s.commonName }); setQ(""); setList([]); }}
                className="block w-full px-4 py-2 text-left hover:bg-emerald-50">
                {s.commonName}{s.scientificName && <span className="ml-2 text-sm italic text-stone-500">{s.scientificName}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
