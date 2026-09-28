import Link from "next/link";
import { ListingGrid } from "@/components/ListingCardView";
import { publicGet } from "@/lib/server";
import { ExploreFeature } from "@/components/ExploreFeature";
import type { Article, CategoryTree, SearchResult } from "@/lib/types";

const QUICK = [["Tặng & trao đổi", "/tim-kiem?type=Give"], ["Cho thuê", "/tim-kiem?type=Rent"], ["Cần mua", "/tim-kiem?type=Buy"], ["Chỉ nhà vườn", "/tim-kiem?gardenOnly=true"], ["Bản đồ nhà vườn", "/ban-do"]];

export default async function Home() {
  const [categories, latest, today, campaigns] = await Promise.all([
    publicGet<CategoryTree[]>("/api/categories", 3600),
    publicGet<SearchResult>("/api/listings?pageSize=12", 60),
    publicGet<Article>("/api/explore/today", 300),
    publicGet<{ id: string; name: string; description?: string; bannerUrl?: string | null; bannerLink?: string | null }[]>("/api/campaigns/active", 300),
  ]);

  return (
    <div className="space-y-16 lg:space-y-20">
      <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-wood-600">Chợ cây trồng của người Việt</p>
          <h1 className="text-5xl leading-[1.04] tracking-tight text-emerald-800 sm:text-6xl lg:text-7xl">
            Tìm một chậu cây <span className="italic text-emerald-600">đúng với khoảng sân</span> của bạn.
          </h1>
          <p className="max-w-lg text-lg text-stone-700">Mua bán, trao đổi cây cảnh, bonsai, cây giống và vật tư làm vườn trực tiếp với nhà vườn và người trồng gần bạn.</p>
          <form action="/tim-kiem" className="flex max-w-xl items-center gap-2 rounded-full border border-stone-300 bg-white p-2 pl-6">
            <label htmlFor="hero-q" className="sr-only">Tìm cây</label>
            <input id="hero-q" name="q" placeholder="Bạn đang tìm cây gì? Vd: sen đá, mai vàng…" className="h-11 min-w-0 flex-1 bg-transparent text-base placeholder:text-stone-400 focus:outline-none" />
            <button className="h-12 rounded-full bg-emerald-600 px-6 font-bold text-stone-50 hover:bg-emerald-700">Tìm kiếm</button>
          </form>
          <div className="flex flex-wrap gap-2.5 text-[15px]">
            {QUICK.map(([t, h]) => <Link key={h} href={h} className="rounded-full border border-stone-300 px-4 py-2 text-stone-700 hover:border-emerald-700 hover:text-emerald-800">{t}</Link>)}
          </div>
        </div>
        <div className="hidden h-[520px] grid-cols-2 grid-rows-2 gap-4 md:grid">
          <div className="row-span-2 rounded-t-[200px] rounded-b-2xl bg-emerald-600" />
          <div className="rounded-2xl bg-wood-400" />
          <div className="flex flex-col justify-between rounded-2xl bg-emerald-800 p-6 text-stone-50">
            <p className="text-2xl italic leading-tight">Xem cây tận mắt, trả tiền khi ưng.</p>
            <Link href="/nha-vuon" className="text-sm font-bold text-wood-200 hover:text-stone-50">Mở gian hàng nhà vườn →</Link>
          </div>
        </div>
      </section>

      {categories && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => (
            <div key={c.id} className={`flex flex-col gap-3 rounded-2xl border p-6 ${i === 3 ? "border-stone-300 bg-stone-100" : "border-stone-200 bg-white"}`}>
              <Link href={`/tim-kiem?rootCategoryId=${c.id}`} className={`text-2xl leading-tight hover:underline ${i === 3 ? "text-wood-800" : "text-emerald-800"}`}>{c.name}</Link>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-stone-600">
                {c.children.map((s) => <Link key={s.id} href={`/tim-kiem?categoryId=${s.id}`} className="hover:text-emerald-700 hover:underline">{s.name}</Link>)}
              </div>
            </div>
          ))}
        </section>
      )}

      {campaigns && campaigns.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <Link key={c.id} href={c.bannerLink || `/tim-kiem?q=${encodeURIComponent(c.name)}`} className="group relative overflow-hidden rounded-2xl bg-emerald-800 text-stone-50">
              {c.bannerUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 transition group-hover:opacity-70" />
              )}
              <div className="relative flex min-h-40 flex-col justify-end p-6">
                <p className="text-3xl leading-tight">{c.name}</p>
                {c.description && <p className="text-emerald-50">{c.description}</p>}
              </div>
            </Link>
          ))}
        </section>
      )}

      {today && <ExploreFeature article={today} />}

      <section className="space-y-7">
        <div className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <h2 className="text-4xl tracking-tight text-emerald-800">Tin mới <span className="italic text-wood-600">nhất</span></h2>
          <Link href="/tim-kiem" className="font-bold text-emerald-600 hover:text-emerald-800">Xem tất cả</Link>
        </div>
        {latest ? (
          latest.items.length > 0 ? <ListingGrid items={latest.items} /> : <p className="text-stone-500">Chưa có tin nào. Hãy là người đầu tiên <Link href="/dang-tin" className="text-emerald-700 underline">đăng tin</Link>.</p>
        ) : (
          <p className="text-red-700">Không tải được dữ liệu từ máy chủ.</p>
        )}
      </section>

      <section className="grid items-center gap-10 rounded-3xl bg-emerald-800 p-8 text-stone-50 sm:p-12 lg:grid-cols-2 lg:p-16">
        <div className="flex flex-col gap-5">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-wood-400">Dành cho nhà vườn &amp; shop</p>
          <h2 className="text-4xl leading-tight lg:text-5xl">Mở gian hàng, <span className="italic text-wood-200">hiện trên bản đồ</span> nhà vườn.</h2>
          <p className="max-w-md text-emerald-100">Xác minh một lần, có trang gian hàng riêng và vị trí vườn để người mua gần bạn tìm tới.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/nha-vuon" className="rounded-full bg-wood-200 px-6 py-3 font-bold text-emerald-900 hover:bg-stone-50">Đăng ký nhà vườn</Link>
            <Link href="/ban-do" className="rounded-full border border-emerald-500 px-6 py-3 font-bold text-stone-50 hover:border-stone-50">Xem bản đồ</Link>
          </div>
        </div>
        <div className="hidden h-72 rounded-2xl border border-emerald-600 bg-emerald-700 lg:block" />
      </section>
    </div>
  );
}
