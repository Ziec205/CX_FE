import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicGet } from "@/lib/server";
import type { Article } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await publicGet<Article>(`/api/explore/${(await params).slug}`, 300);
  return a ? { title: a.title, description: a.summary ?? undefined, openGraph: { images: a.cover ? [a.cover.urls.full] : [] } } : {};
}

export default async function ArticlePage({ params }: Props) {
  const a = await publicGet<Article>(`/api/explore/${(await params).slug}`, 300);
  if (!a) notFound();
  const [cover, ...rest] = a.photos ?? [];
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link href="/kham-pha" className="text-sm text-emerald-700 hover:underline">← Khám phá</Link>
      <header className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-wood-600">{a.publishAt && new Date(a.publishAt).toLocaleDateString("vi-VN")}</p>
        <h1 className="text-4xl leading-tight tracking-tight text-emerald-800 sm:text-5xl">{a.title}</h1>
        {a.summary && <p className="text-xl italic text-stone-600">{a.summary}</p>}
      </header>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.urls.full} alt={a.title} className="w-full rounded-2xl object-cover" />
      )}
      <div className="space-y-4 text-lg leading-relaxed text-stone-800">
        {(a.body ?? "").split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rest.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.urls.card} alt="" className="aspect-square w-full rounded-xl object-cover" />
          ))}
        </div>
      )}
      <footer className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-4">
        {a.tags.map((t) => <span key={t} className="rounded-full bg-stone-100 px-3 py-1 text-sm">#{t}</span>)}
        {a.speciesId && <Link href={`/tim-kiem?speciesId=${a.speciesId}`} className="ml-auto font-bold text-emerald-700 hover:underline">Xem tin đang bán loài này →</Link>}
      </footer>
    </article>
  );
}
