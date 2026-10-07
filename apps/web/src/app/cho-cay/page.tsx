import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MoneyInput } from "@/components/MoneyInput";
import { ListingGrid } from "@/components/ListingCardView";
import { field } from "@/components/ui";
import { PLANT_USES } from "@/lib/plantUses";
import { PROVINCES } from "@/lib/provinces";
import { publicGet } from "@/lib/server";
import type { CategoryTree, SearchResult } from "@/lib/types";
import { NearMeButton } from "../tim-kiem/NearMeButton";
import { MarketFeed } from "./MarketFeed";

export const metadata: Metadata = {
  title: "Chợ cây",
  description: "Tin rao bán cây cảnh, bonsai, lan, cây giống và vật tư mới nhất — lọc theo danh mục, công dụng, giá, ngày đăng và vị trí.",
};

type SP = Record<string, string | string[] | undefined>;

/** Tham số được giữ lại trên URL. Chợ cây luôn là tin Bán. */
const KEYS = ["q", "rootCategoryId", "categoryId", "use", "provinceId", "priceMin", "priceMax", "postedWithinDays", "sort", "lat", "lng", "radiusKm", "gardenOnly", "realPhotoOnly", "escrowOnly"];

const POSTED: [string, string][] = [["", "Mọi lúc"], ["1", "24 giờ qua"], ["3", "3 ngày"], ["7", "7 ngày"], ["30", "30 ngày"]];
const PRICE_PRESETS: [string, string, string][] = [
  ["Dưới 100k", "", "100000"], ["100k – 500k", "100000", "500000"], ["500k – 2 triệu", "500000", "2000000"],
  ["2 – 10 triệu", "2000000", "10000000"], ["Trên 10 triệu", "10000000", ""],
];

export default async function MarketPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const current = new URLSearchParams();
  for (const k of KEYS) if (v(k)) current.set(k, v(k));

  /** Đường dẫn giữ bộ lọc hiện tại, đổi/xóa một số khóa (giá trị "" = xóa). */
  const href = (patch: Record<string, string>) => {
    const n = new URLSearchParams(current);
    for (const [k, val] of Object.entries(patch)) if (val) n.set(k, val); else n.delete(k);
    const s = n.toString();
    return s ? `/cho-cay?${s}` : "/cho-cay";
  };

  const apiQuery = new URLSearchParams(current);
  apiQuery.set("type", "Sell");
  const query = apiQuery.toString();

  const [result, categories] = await Promise.all([
    publicGet<SearchResult>(`/api/listings?${query}&page=1&pageSize=24`, 30),
    publicGet<CategoryTree[]>("/api/categories", 3600),
  ]);

  const root = categories?.find((c) => c.id === v("rootCategoryId"))
    ?? categories?.find((c) => c.children.some((s) => s.id === v("categoryId")));
  const leaf = root?.children.find((s) => s.id === v("categoryId"));
  const sort = v("sort");
  const activeCount = ["q", "use", "provinceId", "priceMin", "priceMax", "postedWithinDays", "lat", "gardenOnly", "realPhotoOnly", "escrowOnly"].filter((k) => v(k)).length;

  const filterForm = (
    <form action="/cho-cay" className="space-y-4 border-t border-stone-100 p-4 text-sm">
      {v("rootCategoryId") && <input type="hidden" name="rootCategoryId" value={v("rootCategoryId")} />}
      {v("categoryId") && <input type="hidden" name="categoryId" value={v("categoryId")} />}
      {v("lat") && <><input type="hidden" name="lat" value={v("lat")} /><input type="hidden" name="lng" value={v("lng")} /></>}

      <input name="q" defaultValue={v("q")} placeholder="Tên cây, từ khóa…" className={field} aria-label="Từ khóa" />

      <fieldset className="space-y-2">
        <legend className="mb-1 font-bold text-stone-800">Công dụng</legend>
        <select name="use" defaultValue={v("use")} className={field}>
          <option value="">Mọi công dụng</option>
          {PLANT_USES.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-bold text-stone-800">Giá (đ)</legend>
        <div className="flex gap-2">
          <MoneyInput name="priceMin" defaultValue={v("priceMin")} placeholder="Từ" aria-label="Giá từ" suffix="" className={field} wrapClassName="min-w-0 flex-1" />
          <MoneyInput name="priceMax" defaultValue={v("priceMax")} placeholder="Đến" aria-label="Giá đến" suffix="" className={field} wrapClassName="min-w-0 flex-1" />
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-bold text-stone-800">Ngày đăng</legend>
        <select name="postedWithinDays" defaultValue={v("postedWithinDays")} className={field}>
          {POSTED.map(([val, l]) => <option key={val} value={val}>{l}</option>)}
        </select>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-bold text-stone-800">Vị trí</legend>
        <select name="provinceId" defaultValue={v("provinceId")} className={field}>
          <option value="">Toàn quốc</option>
          {PROVINCES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {v("lat") && (
          <select name="radiusKm" defaultValue={v("radiusKm") || "20"} className={field}>
            {[5, 10, 20, 50, 100].map((r) => <option key={r} value={r}>Trong {r} km quanh tôi</option>)}
          </select>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-bold text-stone-800">Sắp xếp</legend>
        <select name="sort" defaultValue={sort} className={field}>
          <option value="">Mới đăng nhất</option>
          <option value="PriceAsc">Giá thấp → cao</option>
          <option value="PriceDesc">Giá cao → thấp</option>
          {v("lat") && <option value="Nearest">Gần tôi nhất</option>}
        </select>
      </fieldset>

      <div className="space-y-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="gardenOnly" value="true" defaultChecked={v("gardenOnly") === "true"} />Chỉ Nhà vườn/Shop</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="realPhotoOnly" value="true" defaultChecked={v("realPhotoOnly") === "true"} />Ảnh chụp thực tế</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="escrowOnly" value="true" defaultChecked={v("escrowOnly") === "true"} />Có Giao dịch đảm bảo</label>
      </div>

      <button className="w-full rounded-full bg-emerald-800 py-2.5 font-bold text-stone-50 hover:bg-emerald-700">Áp dụng</button>
      <Suspense><NearMeButton basePath="/cho-cay" /></Suspense>
      {activeCount > 0 && (
        <Link href={href({ q: "", use: "", provinceId: "", priceMin: "", priceMax: "", postedWithinDays: "", lat: "", lng: "", radiusKm: "", sort: "", gardenOnly: "", realPhotoOnly: "", escrowOnly: "" })}
          className="block text-center text-emerald-800 underline">Xóa bộ lọc</Link>
      )}
    </form>
  );

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${on ? "border-emerald-800 bg-emerald-800 text-stone-50" : "border-stone-300 bg-white text-stone-700 hover:border-emerald-700"}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-emerald-900 sm:text-6xl">{leaf?.name ?? root?.name ?? "Cây đang được rao bán"}</h1>
          <p className="mt-1 text-stone-600">
            {result ? `${result.total.toLocaleString("vi-VN")} tin` : "—"} · tin mới đăng hiển thị trước
          </p>
        </div>
        <Link href="/dang-tin" className="rounded-full bg-emerald-800 px-5 py-2.5 font-bold text-stone-50 hover:bg-emerald-700">Đăng bán cây</Link>
      </header>

      {/* Danh mục cấp 1 */}
      <nav aria-label="Danh mục" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={href({ rootCategoryId: "", categoryId: "" })} className={chip(!root)}>Tất cả</Link>
        {categories?.map((c) => (
          <Link key={c.id} href={href({ rootCategoryId: c.id, categoryId: "" })} className={chip(root?.id === c.id)}>{c.name}</Link>
        ))}
      </nav>
      {/* Danh mục cấp 2 */}
      {root && (
        <nav aria-label={`Danh mục con của ${root.name}`} className="-mx-4 -mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href={href({ rootCategoryId: root.id, categoryId: "" })} className={`${chip(!leaf)} text-xs`}>Tất cả {root.name.toLowerCase()}</Link>
          {root.children.map((s) => (
            <Link key={s.id} href={href({ rootCategoryId: "", categoryId: s.id })} className={`${chip(leaf?.id === s.id)} text-xs`}>{s.name}</Link>
          ))}
        </nav>
      )}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          {/* Điện thoại: thu gọn, mở khi cần (tự mở nếu đang có bộ lọc). Máy tính: luôn hiện ở cột trái. */}
          <details open={activeCount > 0} className="rounded-2xl border border-stone-200 bg-white lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-bold text-emerald-900">
              <span>Bộ lọc {activeCount > 0 && <span className="rounded-full bg-emerald-800 px-2 text-xs text-stone-50">{activeCount}</span>}</span><span aria-hidden className="text-stone-400">▾</span>
            </summary>
            {filterForm}
          </details>
          <div className="hidden rounded-2xl border border-stone-200 bg-white lg:block">
            <p className="flex items-center justify-between p-4 font-bold text-emerald-900">Bộ lọc{activeCount > 0 && <span className="rounded-full bg-emerald-800 px-2 text-xs text-stone-50">{activeCount}</span>}</p>
            {filterForm}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          {/* Lọc nhanh */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {PRICE_PRESETS.map(([l, min, max]) => {
              const on = v("priceMin") === min && v("priceMax") === max;
              return <Link key={l} href={on ? href({ priceMin: "", priceMax: "" }) : href({ priceMin: min, priceMax: max })} className={`${chip(on)} text-xs`}>{l}</Link>;
            })}
            {PLANT_USES.slice(0, 6).map((u) => (
              <Link key={u} href={href({ use: v("use") === u ? "" : u })} className={`${chip(v("use") === u)} text-xs`}>{u}</Link>
            ))}
          </div>

          {!result && <p className="rounded-2xl bg-red-50 p-4 text-red-800">Không tải được danh sách tin. Máy chủ có thể đang khởi động, hãy tải lại trang sau ít phút.</p>}
          {result && result.priority.length > 0 && (
            <div className="rounded-2xl bg-wood-100 p-4 ring-1 ring-wood-200">
              <p className="mb-3 font-display text-lg font-bold text-wood-800">Tin ưu tiên</p>
              <ListingGrid items={result.priority} morph={false} />
            </div>
          )}
          {result && <MarketFeed key={query} query={query} initial={result} groupByDate={!sort} />}
        </div>
      </div>
    </div>
  );
}
