import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListingGrid } from "@/components/ListingCardView";
import { field } from "@/components/ui";
import { PROVINCES } from "@/lib/provinces";
import { publicGet } from "@/lib/server";
import type { CategoryTree, SearchResult } from "@/lib/types";
import { SaveSearchButton } from "@/components/SaveSearchButton";
import { NearMeButton } from "./NearMeButton";

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const q = (await searchParams).q;
  return { title: q ? `Tìm "${q}"` : "Tìm kiếm cây trồng" };
}

const KEYS = ["q", "type", "categoryId", "rootCategoryId", "provinceId", "priceMin", "priceMax", "gardenOnly", "escrowOnly", "realPhotoOnly", "sort", "page", "lat", "lng", "radiusKm", "sellerId", "speciesId"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const k of KEYS) {
    const v = sp[k];
    if (typeof v === "string" && v !== "") params.set(k, v);
  }
  for (const [k, v] of Object.entries(sp)) if (k.startsWith("attr.") && typeof v === "string" && v) params.set(k, v);
  params.set("pageSize", "24");

  const [result, categories] = await Promise.all([
    publicGet<SearchResult>(`/api/listings?${params}`, 30),
    publicGet<CategoryTree[]>("/api/categories", 3600),
  ]);
  const page = Number(sp.page ?? 1);
  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;
  const pageHref = (p: number) => { const n = new URLSearchParams(params); n.delete("pageSize"); n.set("page", String(p)); return `/tim-kiem?${n}`; };
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside>
        <form action="/tim-kiem" className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 text-sm">
          <input name="q" defaultValue={v("q")} placeholder="Từ khóa" className={field} />
          <select name="type" defaultValue={v("type")} className={field}>
            <option value="">Mọi loại tin</option><option value="Sell">Bán</option><option value="Buy">Cần mua</option>
            <option value="Rent">Cho thuê</option><option value="Give">Tặng / trao đổi</option>
          </select>
          <select name="categoryId" defaultValue={v("categoryId")} className={field}>
            <option value="">Mọi danh mục</option>
            {categories?.map((c) => (
              <optgroup key={c.id} label={c.name}>{c.children.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
            ))}
          </select>
          <select name="provinceId" defaultValue={v("provinceId")} className={field}>
            <option value="">Toàn quốc</option>
            {PROVINCES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input name="priceMin" type="number" min={0} defaultValue={v("priceMin")} placeholder="Giá từ" className={field} />
            <input name="priceMax" type="number" min={0} defaultValue={v("priceMax")} placeholder="đến" className={field} />
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" name="gardenOnly" value="true" defaultChecked={v("gardenOnly") === "true"} />Chỉ Nhà vườn/Shop</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="escrowOnly" value="true" defaultChecked={v("escrowOnly") === "true"} />Có Giao dịch đảm bảo</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="realPhotoOnly" value="true" defaultChecked={v("realPhotoOnly") === "true"} />Ảnh chụp thực tế</label>
          <select name="sort" defaultValue={v("sort")} className={field}>
            <option value="">Mới nhất</option><option value="PriceAsc">Giá thấp → cao</option><option value="PriceDesc">Giá cao → thấp</option>
            {v("lat") && <option value="Nearest">Gần tôi nhất</option>}
          </select>
          {v("lat") && <><input type="hidden" name="lat" value={v("lat")} /><input type="hidden" name="lng" value={v("lng")} />
            <select name="radiusKm" defaultValue={v("radiusKm") || "20"} className={field}>
              {[5, 10, 20, 50, 100].map((r) => <option key={r} value={r}>Trong {r} km</option>)}
            </select></>}
          <button className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white">Lọc</button>
          <Suspense><NearMeButton /></Suspense>
        </form>
      </aside>

      <div className="space-y-4">
        {!result && <p className="text-red-600">Không tải được kết quả.</p>}
        {result && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-stone-500">{result.total.toLocaleString("vi-VN")} tin{v("q") && <> cho “<b>{v("q")}</b>”</>}</p>
              {!v("sellerId") && <SaveSearchButton params={Object.fromEntries(params)} label={v("q") || "Tìm kiếm đã lưu"} />}
            </div>
            {result.priority.length > 0 && (
              <div className="rounded-xl bg-wood-100 p-3">
                <p className="mb-2 font-display text-lg font-bold text-wood-800">Tin ưu tiên</p>
                <ListingGrid items={result.priority} morph={false} />
              </div>
            )}
            {result.items.length === 0 ? <p className="py-10 text-center text-stone-500">Không tìm thấy tin phù hợp. Thử bỏ bớt bộ lọc?</p> : <ListingGrid items={result.items} />}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 text-sm">
                {page > 1 && <Link href={pageHref(page - 1)} className="rounded border bg-white px-3 py-1">← Trước</Link>}
                <span className="px-3 py-1">Trang {page}/{totalPages}</span>
                {page < totalPages && <Link href={pageHref(page + 1)} className="rounded border bg-white px-3 py-1">Sau →</Link>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
