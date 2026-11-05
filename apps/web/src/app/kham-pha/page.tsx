import type { Metadata } from "next";
import Link from "next/link";
import { CardRow } from "@/components/ExploreCards";
import { CHIPS, matches } from "@/lib/explore";
import { publicGet } from "@/lib/server";
import type { Article } from "@/lib/types";

export const metadata: Metadata = { title: "Khám phá", description: "Tìm loại cây phù hợp nhất cho không gian của bạn, do đội ngũ Chạm Xanh tuyển chọn." };

/** Theo Figma: lời chào + chip, hai hàng thẻ cây, danh sách bài đọc thêm. */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ loai?: string }> }) {
  const chip = (await searchParams).loai;
  const data = await publicGet<{ items: Article[] }>("/api/explore?page=1&pageSize=50", 300);
  const all = data?.items ?? [];
  const chips = Object.keys(CHIPS).filter((c) => all.some((a) => matches(a, c)));
  const items = chip && CHIPS[chip] ? all.filter((a) => matches(a, chip)) : all;
  const first = items.slice(0, 5), second = items.slice(5, 9), rest = items.slice(9);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="cx-h1">Chào bạn đến với Chạm Xanh</h1>
          <p className="cx-lead">Tìm loại cây phù hợp nhất cho không gian của bạn.</p>
        </div>
        <Link href="/cho-cay" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-stone-100 text-center text-[11px] font-semibold leading-tight text-stone-700">Chợ cây</Link>
      </header>

      {chips.length > 0 && (
        <nav aria-label="Lọc bài" className="-mx-4 flex gap-2 cx-hscroll overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {chips.map((c) => (
            <Link key={c} href={chip === c ? "/kham-pha" : `/kham-pha?loai=${encodeURIComponent(c)}`} aria-current={chip === c ? "page" : undefined} className="cx-chip-soft">{c}</Link>
          ))}
        </nav>
      )}

      {!data && <p className="cx-card text-red-700">Không tải được dữ liệu từ máy chủ.</p>}
      {data && items.length === 0 && <p className="cx-card cx-body">Chưa có bài viết nào.</p>}

      {first.length > 0 && <CardRow items={first} />}
      {second.length > 0 && (
        <section className="space-y-3">
          <h2 className="cx-h2">Góc xanh cho bạn</h2>
          <CardRow items={second} />
        </section>
      )}
      {rest.length > 0 && (
        <section className="space-y-3">
          <h2 className="cx-h2">Đọc thêm</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {rest.map((a) => (
              <Link key={a.id} href={`/kham-pha/${a.slug}`} className="cx-plant-card group !flex items-center gap-4 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-100">
                  {a.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.cover.urls.thumb} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-2 font-sans text-sm font-bold text-stone-900 group-hover:underline">{a.title}</h3>
                  {a.summary && <p className="mt-1 line-clamp-2 text-xs text-stone-600">{a.summary}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
