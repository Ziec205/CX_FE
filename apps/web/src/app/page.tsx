import Link from "next/link";
import { ListingGrid } from "@/components/ListingCardView";
import { publicGet } from "@/lib/server";
import { timeAgo } from "@/lib/format";
import type { Article, CategoryTree, PostSummary, SearchResult } from "@/lib/types";

const QUICK = [["Tặng & trao đổi", "/tim-kiem?type=Give"], ["Cho thuê", "/tim-kiem?type=Rent"], ["Cần mua", "/tim-kiem?type=Buy"], ["Chỉ nhà vườn", "/cho-cay?gardenOnly=true"], ["Gần tôi", "/ban-do"]];

export default async function Home() {
  const [categories, latest, today, campaigns, posts] = await Promise.all([
    publicGet<CategoryTree[]>("/api/categories", 3600),
    publicGet<SearchResult>("/api/listings?type=Sell&pageSize=12", 60),
    publicGet<Article>("/api/explore/today", 300),
    publicGet<{ id: string; name: string; description?: string; bannerUrl?: string | null; bannerLink?: string | null }[]>("/api/campaigns/active", 300),
    publicGet<{ items: PostSummary[] }>("/api/community/posts?pageSize=3", 60),
  ]);

  return (
    <div className="space-y-14 lg:space-y-20">
      {/* ---------- Chợ cây: phần chính của trang chủ ---------- */}
      <section aria-labelledby="market-title" className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-5">
          <h1 id="market-title" className="text-[2.6rem] font-extrabold text-emerald-900 sm:text-6xl lg:text-7xl">
            Chợ cây
            <span className="block text-2xl font-semibold text-stone-600 sm:text-3xl lg:text-4xl">
              {latest ? `${latest.total.toLocaleString("vi-VN")} cây đang chờ người mới` : "Cây cảnh, bonsai, cây giống và vật tư"}
            </span>
          </h1>
          <form action="/cho-cay" className="flex max-w-2xl items-center gap-2 rounded-full border-2 border-stone-900 bg-white p-1.5 pl-5">
            <label htmlFor="hero-q" className="sr-only">Tìm cây trong chợ</label>
            <input id="hero-q" name="q" placeholder="Sen đá, mai vàng, chậu gốm…" className="h-11 min-w-0 flex-1 bg-transparent text-base placeholder:text-stone-400 focus:outline-none" />
            <button className="cx-press h-11 rounded-full bg-wood-400 px-6 font-semibold text-stone-900 hover:bg-wood-200">Tìm trong chợ</button>
          </form>
          {categories && (
            <nav aria-label="Danh mục chợ cây" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {categories.map((c) => (
                <Link key={c.id} href={`/cho-cay?rootCategoryId=${c.id}`}
                  className="cx-press shrink-0 rounded-full bg-emerald-800 px-4 py-2 text-[15px] font-semibold text-white hover:bg-emerald-700">{c.name}</Link>
              ))}
              {QUICK.map(([t, h]) => (
                <Link key={h} href={h} className="shrink-0 rounded-full border border-stone-300 bg-white px-4 py-2 text-[15px] text-stone-700 hover:border-emerald-700">{t}</Link>
              ))}
            </nav>
          )}
        </div>

        {/* Khám phá: chỉ hé một phần nhỏ, mời bấm vào xem tiếp. */}
        {today && <ExplorePeek article={today} />}
      </section>

      <section aria-label="Tin mới trong chợ" className="-mt-6 space-y-6 lg:-mt-10">
        {latest ? (
          latest.items.length > 0 ? <ListingGrid items={latest.items} /> : (
            <p className="rounded-2xl border-2 border-dashed border-stone-300 p-10 text-center text-stone-600">
              Chợ chưa có tin nào. <Link href="/dang-tin" className="font-semibold text-emerald-700 underline">Đăng cây đầu tiên</Link>
            </p>
          )
        ) : (
          <p className="rounded-2xl bg-red-50 p-4 text-red-800">Không tải được tin từ máy chủ. Máy chủ có thể đang khởi động, hãy tải lại trang sau ít phút.</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/cho-cay" className="cx-press rounded-full bg-wood-400 px-7 py-3 font-semibold text-stone-900 hover:bg-wood-200">Vào chợ xem tất cả</Link>
          <Link href="/dang-tin" className="cx-press rounded-full border-2 border-stone-900 px-7 py-2.5 font-semibold hover:bg-white">Đăng bán cây</Link>
        </div>
      </section>

      {campaigns && campaigns.length > 0 && (
        <section aria-label="Chiến dịch" className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <Link key={c.id} href={c.bannerLink || `/tim-kiem?q=${encodeURIComponent(c.name)}`} className="group relative overflow-hidden rounded-2xl bg-emerald-800 text-white">
              {c.bannerUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 transition group-hover:opacity-70" />
              )}
              <div className="relative flex min-h-40 flex-col justify-end p-6">
                <p className="font-display text-3xl font-bold">{c.name}</p>
                {c.description && <p className="text-emerald-50">{c.description}</p>}
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* ---------- Chăm cây sau khi mua: vườn, lịch tưới, cộng đồng ---------- */}
      <section aria-labelledby="care-title" className="space-y-6">
        <h2 id="care-title" className="text-3xl font-bold text-emerald-900 sm:text-4xl">Mua cây rồi, chăm tiếp ở đây</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/vuon-cua-toi" className="group flex flex-col gap-3 rounded-3xl bg-emerald-800 p-6 text-white">
            <LeafMark />
            <h3 className="text-2xl font-bold">Hồ sơ vườn</h3>
            <p className="text-emerald-100">Lưu từng cây bạn đang trồng: ảnh, loài, vị trí đặt và ngày bắt đầu trồng.</p>
            <span className="mt-auto font-semibold text-wood-400 group-hover:underline">Mở vườn của tôi</span>
          </Link>
          <Link href="/vuon-cua-toi#lich-nhac" className="group flex flex-col gap-3 rounded-3xl bg-water-500 p-6 text-white">
            <DropMark />
            <h3 className="text-2xl font-bold">Nhắc lịch tưới</h3>
            <p className="text-water-50">Đặt giờ tưới, bón phân, thay chậu. Đến giờ, Chạm Xanh gửi thông báo cho bạn.</p>
            <span className="mt-auto font-semibold text-white group-hover:underline">Đặt lời nhắc đầu tiên</span>
          </Link>
          <div className="flex flex-col gap-3 rounded-3xl border border-stone-300 bg-white p-6">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-2xl font-bold text-emerald-900">Cộng đồng</h3>
              <Link href="/cong-dong" className="text-sm font-semibold text-emerald-700 hover:underline">Xem tất cả</Link>
            </div>
            {posts && posts.items.length > 0 ? (
              <ul className="divide-y divide-stone-200">
                {posts.items.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <Link href={`/cong-dong/${p.id}`} className="block py-2.5 hover:text-emerald-700">
                      <span className="line-clamp-2 font-semibold leading-snug">{p.title}</span>
                      <span className="text-sm text-stone-500">{p.comments} trả lời, {timeAgo(p.lastActivityAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-stone-600">Hỏi cây bị vàng lá, khoe chậu mới, chia sẻ cách chăm.</p>
            )}
            <Link href="/cong-dong/dang-bai" className="mt-auto self-start rounded-full bg-emerald-800 px-5 py-2 font-semibold text-white hover:bg-emerald-700">Đặt câu hỏi</Link>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-start gap-5 rounded-3xl border-2 border-stone-900 bg-wood-100 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-2">
          <h2 className="text-3xl font-bold text-stone-900">Bạn có nhà vườn hoặc shop cây?</h2>
          <p className="text-stone-700">Xác minh một lần để có gian hàng riêng, tick xanh và vị trí trên bản đồ nhà vườn.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/nha-vuon" className="cx-press rounded-full bg-stone-900 px-6 py-3 font-semibold text-wood-400 hover:bg-emerald-900">Mở gian hàng</Link>
          <Link href="/ban-do" className="rounded-full border-2 border-stone-900 px-6 py-2.5 font-semibold hover:bg-white">Xem bản đồ</Link>
        </div>
      </section>
    </div>
  );
}

function ExplorePeek({ article }: { article: Article }) {
  const cover = article.cover ?? article.photos?.[0];
  return (
    <Link href={`/kham-pha/${article.slug}`} className="group flex gap-4 self-start rounded-3xl bg-white p-3 ring-1 ring-stone-200 hover:ring-emerald-600 lg:flex-col lg:p-4">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.urls.card} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover lg:h-40 lg:w-full" />
      )}
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-emerald-700">Khám phá hôm nay</p>
        <p className="font-display text-xl font-bold leading-tight text-stone-900 group-hover:text-emerald-800">{article.title}</p>
        {article.summary && <p className="line-clamp-2 text-sm text-stone-600">{article.summary}</p>}
      </div>
    </Link>
  );
}

function LeafMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden>
      <path d="M16 29V15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 16C16 8 21 4 28 4c0 7-5 12-12 12z" fill="var(--color-wood-400)" />
      <path d="M16 19c0-5-3.5-8.5-10-8.5 0 5 3.5 8.5 10 8.5z" fill="currentColor" />
    </svg>
  );
}

function DropMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden>
      <path d="M16 3s9 9.5 9 16a9 9 0 01-18 0c0-6.5 9-16 9-16z" fill="currentColor" />
      <path d="M11.5 19.5a4.5 4.5 0 004.5 4.5" stroke="var(--color-water-500)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
