import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardRow } from "@/components/ExploreCards";
import { ShareButton } from "@/components/ShareButton";
import { chipsOf, matches } from "@/lib/explore";
import { publicGet } from "@/lib/server";
import type { Article } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };
type SpeciesInfo = { id: string; commonName: string; scientificName?: string | null; family?: string | null; light?: string | null; water?: string | null; difficulty?: number | null; imageUrl?: string | null };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await publicGet<Article>(`/api/explore/${(await params).slug}`, 300);
  return a ? { title: a.title, description: a.summary ?? undefined, openGraph: { images: a.cover ? [a.cover.urls.full] : [] } } : {};
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-100 p-3">
      <p className="text-xs text-stone-600">{label}</p>
      <p className="text-sm font-bold text-stone-900">{value}</p>
    </div>
  );
}

export default async function ArticlePage({ params }: Props) {
  const a = await publicGet<Article>(`/api/explore/${(await params).slug}`, 300);
  if (!a) notFound();
  const [cover, ...rest] = a.photos ?? [];

  const [list, species, allSpecies] = await Promise.all([
    publicGet<{ items: Article[] }>("/api/explore?page=1&pageSize=50", 300),
    a.speciesId ? publicGet<SpeciesInfo>(`/api/species/${a.speciesId}`, 3600) : null,
    a.speciesId ? publicGet<SpeciesInfo[]>("/api/species?limit=200", 3600) : null,
  ]);

  const others = (list?.items ?? []).filter((x) => x.id !== a.id);
  const chips = chipsOf(a);
  const same = others.filter((x) => chips.some((c) => matches(x, c)));
  const related = [...same, ...others.filter((x) => !same.includes(x))].slice(0, 5);
  const family = species?.family ? (allSpecies ?? []).filter((s) => s.family === species.family && s.id !== species.id).slice(0, 8) : [];
  const info = species
    ? ([
        ["Ánh sáng", species.light],
        ["Tưới nước", species.water],
        ["Độ khó", species.difficulty ? `${species.difficulty}/5` : null],
        ["Họ", species.family],
      ].filter(([, v]) => v) as [string, string][])
    : [];

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="relative -mx-4 overflow-hidden bg-emerald-100 sm:mx-0 sm:rounded-3xl">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.urls.full} alt={a.title} className="aspect-square max-h-[520px] w-full object-cover" />
        )}
        <div className="absolute inset-x-3 top-3 flex justify-between">
          <Link href="/kham-pha" aria-label="Quay lại Khám phá" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-lg text-stone-900">←</Link>
          <ShareButton title={a.title} />
        </div>
        <div className={`${cover ? "absolute inset-x-0 bottom-0" : ""} bg-gradient-to-t from-stone-50 via-stone-50/90 to-transparent px-4 pb-4 pt-20 sm:px-6`}>
          {chips[0] && <span className="cx-badge">{chips[0]}</span>}
          <h1 className="cx-h1 mt-2 !text-3xl sm:!text-4xl">{a.title}</h1>
        </div>
      </header>

      {a.summary && <p className="cx-lead">{a.summary}</p>}

      {info.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {info.map(([label, value]) => <Info key={label} label={label} value={value} />)}
        </div>
      )}

      <div className="space-y-4 text-base leading-relaxed text-stone-800">
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

      {a.speciesId && <Link href={`/tim-kiem?speciesId=${a.speciesId}`} className="cx-link block">Xem tin đang bán loài này →</Link>}

      {family.length > 0 && (
        <section className="space-y-3">
          <h2 className="cx-h2">Cây cùng họ</h2>
          <div className="flex flex-wrap gap-2">
            {family.map((s) => <Link key={s.id} href={`/tim-kiem?speciesId=${s.id}`} className="cx-chip-soft">{s.commonName}</Link>)}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="cx-h2">{same.length > 0 ? "Cây cùng cách chăm sóc" : "Bài khác"}</h2>
          <CardRow items={related} />
        </section>
      )}
    </article>
  );
}
