import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { publicGet } from "@/lib/server";
import type { Article } from "@/lib/types";

export const metadata: Metadata = { title: "Khám phá", description: "Mỗi ngày một loài cây ít người biết, do đội ngũ Chạm Xanh tuyển chọn." };

const day = (a: Article) => a.publishAt && new Date(a.publishAt).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" });
const img = (a: Article, size: string) => a.cover?.urls[size] ?? a.cover?.urls.card;

/** Trang 1: bài mới nhất làm "Cây của ngày" khổ lớn, phần còn lại là lưới thẻ cùng kiểu với Chợ cây. */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);
  const data = await publicGet<{ items: Article[]; total: number; pageSize: number }>(`/api/explore?page=${page}&pageSize=13`, 300);
  const pages = data ? Math.ceil(data.total / data.pageSize) : 1;
  const [featured, ...rest] = page === 1 ? data?.items ?? [] : [undefined, ...(data?.items ?? [])];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Mỗi ngày một loài cây" title="Khám phá" lead="Những loài cây ít người biết, cách nhận ra và cách chăm, do đội ngũ Chạm Xanh tuyển chọn." />

      {!data && <p className="cx-card text-red-700">Không tải được dữ liệu từ máy chủ.</p>}
      {data?.items.length === 0 && <p className="cx-card cx-body">Chưa có bài viết nào.</p>}

      {featured && (
        <Link href={`/kham-pha/${featured.slug}`} className="cx-card-flush group grid md:grid-cols-[3fr_2fr]">
          <div className="relative aspect-[4/3] bg-emerald-100 md:aspect-auto md:min-h-80">
            {featured.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img(featured, "full")} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
            )}
          </div>
          <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
            <span className="cx-badge self-start bg-wood-100 text-wood-800">Cây của ngày</span>
            <h2 className="cx-h2 group-hover:underline sm:text-3xl">{featured.title}</h2>
            {featured.summary && <p className="cx-body line-clamp-4">{featured.summary}</p>}
            <p className="cx-meta">{day(featured)}</p>
            <span className="cx-link mt-1">Đọc bài →</span>
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <section aria-label="Bài trước đó" className="space-y-4">
          {page === 1 && <h2 className="cx-h2">Bài trước đó</h2>}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((a) => a && (
              <Link key={a.id} href={`/kham-pha/${a.slug}`} className="cx-card-flush cx-reveal group flex flex-col">
                <div className="aspect-[4/3] overflow-hidden bg-emerald-100">
                  {a.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img(a, "card")} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-5">
                  <h3 className="cx-title group-hover:underline">{a.title}</h3>
                  {a.summary && <p className="cx-body line-clamp-2">{a.summary}</p>}
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="cx-meta mr-1">{day(a)}</span>
                    {a.tags.slice(0, 2).map((t) => <span key={t} className="cx-badge">{t}</span>)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {pages > 1 && (
        <nav aria-label="Trang" className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/kham-pha?page=${p}`} aria-current={p === page ? "page" : undefined} className="cx-chip min-w-10 justify-center">{p}</Link>
          ))}
        </nav>
      )}
    </div>
  );
}
