import type { Metadata } from "next";
import Link from "next/link";
import { publicGet } from "@/lib/server";
import type { CategoryTree, Species } from "@/lib/types";

export const metadata: Metadata = { title: "Thư viện cây", description: "Tra cứu loài cây: tên khác, cách chăm, ánh sáng, tưới nước, giá tham khảo và tin đang bán." };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; categoryId?: string }> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ limit: "50" });
  if (sp.q) qs.set("q", sp.q);
  if (sp.categoryId) qs.set("categoryId", sp.categoryId);
  const [species, categories] = await Promise.all([
    publicGet<Species[]>(`/api/species?${qs}`, 3600),
    publicGet<CategoryTree[]>("/api/categories", 3600),
  ]);
  const live = categories?.flatMap((c) => c.children.filter((x) => x.isLivePlant)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold text-emerald-900">Thư viện cây</h1>
        <p className="mt-1 text-stone-600">Tra cứu theo tên thường gọi, tên khác hoặc tên khoa học — gõ không dấu cũng được.</p>
      </div>
      <form action="/thu-vien" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Vd: kim tien, luoi ho, Monstera…" className="h-11 min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-5" />
        <select name="categoryId" defaultValue={sp.categoryId ?? ""} className="h-11 rounded-full border border-stone-300 bg-white px-4">
          <option value="">Mọi nhóm cây</option>
          {live.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="h-11 rounded-full bg-emerald-800 px-6 font-bold text-stone-50">Tìm</button>
      </form>
      {!species && <p className="text-red-700">Không tải được dữ liệu từ máy chủ.</p>}
      {species?.length === 0 && <p className="text-stone-500">Không tìm thấy loài phù hợp.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {species?.map((s) => (
          <li key={s.id}>
            <Link href={`/thu-vien/${s.id}`} className="block h-full rounded-2xl border border-stone-200 bg-white p-4 hover:border-emerald-600">
              <p className="text-xl text-emerald-800">{s.commonName}</p>
              {s.scientificName && <p className="text-sm italic text-stone-500">{s.scientificName}</p>}
              {s.aliases.length > 0 && <p className="mt-1 text-sm text-stone-600">Còn gọi: {s.aliases.slice(0, 3).join(", ")}</p>}
              {s.description && <p className="mt-2 line-clamp-2 text-sm text-stone-700">{s.description}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
