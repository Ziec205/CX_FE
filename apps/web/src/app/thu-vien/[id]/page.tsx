import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingGrid } from "@/components/ListingCardView";
import { shortVnd } from "@/lib/format";
import { publicGet } from "@/lib/server";
import type { PostSummary, SearchResult } from "@/lib/types";

interface SpeciesDetail {
  id: string; commonName: string; aliases: string[]; scientificName?: string | null; family?: string | null; light?: string | null;
  water?: string | null; difficulty?: number | null; petToxicity?: string | null; description?: string | null; legalFlag: string;
  legalBasis?: string | null; priceRefs: { sizeBand: string; medianVnd: number; sampleSize: number }[];
}

type Props = { params: Promise<{ id: string }> };
const load = (id: string) => publicGet<SpeciesDetail>(`/api/species/${id}`, 3600);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await load((await params).id);
  if (!s) return {};
  const names = [s.commonName, ...s.aliases].join(", ");
  return { title: `${s.commonName} — cách chăm, giá, mua ở đâu`, description: `${names}. ${s.description?.slice(0, 140) ?? ""}` };
}

const DIFFICULTY = ["", "Rất dễ", "Dễ", "Trung bình", "Khó", "Rất khó"];
const LEGAL: Record<string, string> = {
  Restricted: "Loài hạn chế mua bán — tin đăng phải qua kiểm duyệt và có giấy tờ nguồn gốc.",
  InvasiveAlien: "Loài ngoại lai xâm hại — không khuyến khích trồng, cần xử lý đúng quy định.",
  Banned: "Loài cấm mua bán.",
};

export default async function SpeciesPage({ params }: Props) {
  const { id } = await params;
  const s = await load(id);
  if (!s) notFound();
  const [listings, posts] = await Promise.all([
    publicGet<SearchResult>(`/api/listings?speciesId=${id}&pageSize=8`, 120),
    publicGet<{ items: PostSummary[] }>(`/api/community/posts?speciesId=${id}`, 300),
  ]);

  const facts: [string, string | null | undefined][] = [
    ["Họ", s.family], ["Ánh sáng", s.light], ["Tưới nước", s.water],
    ["Độ khó", s.difficulty ? DIFFICULTY[s.difficulty] : null], ["Thú cưng", s.petToxicity],
  ];
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Thing", name: s.commonName, alternateName: s.aliases,
    description: s.description ?? undefined, identifier: s.scientificName ?? undefined,
  };

  return (
    <article className="space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div>
        <Link href="/thu-vien" className="text-sm text-emerald-700 hover:underline">← Thư viện cây</Link>
        <h1 className="mt-2 text-4xl tracking-tight text-emerald-800 sm:text-5xl">{s.commonName}</h1>
        {s.scientificName && <p className="text-lg italic text-stone-500">{s.scientificName}</p>}
        {s.aliases.length > 0 && <p className="mt-1 text-stone-600">Còn gọi là: {s.aliases.join(", ")}</p>}
      </div>
      {s.legalFlag !== "None" && LEGAL[s.legalFlag] && (
        <div className="rounded-xl bg-wood-100 px-4 py-3 text-wood-800">⚠ {LEGAL[s.legalFlag]}{s.legalBasis && ` (${s.legalBasis})`}</div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 text-lg leading-relaxed text-stone-800">
          {s.description ? s.description.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>) : <p className="text-stone-500">Đang cập nhật mô tả.</p>}
        </div>
        <aside className="space-y-4">
          <dl className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5 text-[15px]">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-stone-500">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>
          {s.priceRefs.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 text-[15px]">
              <p className="mb-2 font-bold">Giá tham khảo trên Chạm Xanh</p>
              {s.priceRefs.map((p) => (
                <div key={p.sizeBand} className="flex justify-between"><span className="text-stone-500">Cao {p.sizeBand} cm</span><span>~{shortVnd(p.medianVnd)}</span></div>
              ))}
            </div>
          )}
          <Link href={`/vuon-cua-toi`} className="block rounded-full border border-emerald-800/30 bg-white px-5 py-2.5 text-center text-emerald-900 hover:border-emerald-800">+ Thêm vào vườn của tôi</Link>
        </aside>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
          <h2 className="text-3xl text-emerald-800">Đang bán ({listings?.total ?? 0})</h2>
          <Link href={`/tim-kiem?speciesId=${id}`} className="font-bold text-emerald-700 hover:underline">Xem tất cả</Link>
        </div>
        {listings && listings.items.length > 0 ? <ListingGrid items={listings.items} /> : <p className="text-stone-500">Chưa có tin đang bán loài này.</p>}
      </section>

      {posts && posts.items.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-3xl text-emerald-800">Hỏi đáp & kinh nghiệm</h2>
          <ul className="space-y-2">
            {posts.items.slice(0, 6).map((p) => (
              <li key={p.id}><Link href={`/cong-dong/${p.id}`} className="block rounded-xl border border-stone-200 bg-white p-3 hover:border-emerald-600">
                <b>{p.title}</b><span className="ml-2 text-sm text-stone-500">💬 {p.comments}</span>
              </Link></li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
