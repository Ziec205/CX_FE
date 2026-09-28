import Link from "next/link";
import type { Article } from "@/lib/types";

/** Mục Khám phá ở trang chủ: khu vực ảnh bên trái, khu vực nội dung bên phải. */
export function ExploreFeature({ article }: { article: Article }) {
  const photos = article.photos?.length ? article.photos : article.cover ? [article.cover] : [];
  const [cover, ...rest] = photos;
  const paragraphs = (article.body ?? "").split(/\n\s*\n/).filter(Boolean);
  const date = article.publishAt ? new Date(article.publishAt).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" }) : "";

  return (
    <section className="space-y-7">
      <div className="flex items-baseline justify-between border-b border-stone-200 pb-4">
        <h2 className="text-4xl tracking-tight text-emerald-800">Khám phá <span className="italic text-wood-600">hôm nay</span></h2>
        <Link href="/kham-pha" className="font-bold text-emerald-600 hover:text-emerald-800">Các bài trước</Link>
      </div>
      <article className="grid overflow-hidden rounded-3xl border border-stone-200 bg-white lg:grid-cols-2">
        <div className="flex flex-col gap-2 bg-stone-100 p-2">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.urls.full ?? cover.urls.card} alt={article.title} className="aspect-[4/3] w-full rounded-2xl object-cover" />
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {rest.slice(0, 4).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.urls.thumb} alt="" className="aspect-square w-full rounded-xl object-cover" />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 p-6 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-wood-600">Cây ít người biết · {date}</p>
          <h3 className="text-3xl leading-tight text-emerald-800 lg:text-4xl">{article.title}</h3>
          {article.summary && <p className="text-lg italic text-stone-600">{article.summary}</p>}
          <div className="space-y-3 text-[15px] leading-relaxed text-stone-700">
            {paragraphs.slice(0, 3).map((p, i) => <p key={i} className={i === 2 ? "line-clamp-3" : undefined}>{p}</p>)}
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-4 pt-2">
            <Link href={`/kham-pha/${article.slug}`} className="rounded-full bg-emerald-800 px-5 py-2.5 font-bold text-stone-50 hover:bg-emerald-700">Đọc tiếp</Link>
            {article.speciesId && <Link href={`/tim-kiem?speciesId=${article.speciesId}`} className="font-bold text-emerald-700 hover:underline">Xem tin đang bán loài này</Link>}
          </div>
        </div>
      </article>
    </section>
  );
}
