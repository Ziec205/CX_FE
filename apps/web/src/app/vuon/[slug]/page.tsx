import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/FollowButton";
import { ListingGrid } from "@/components/ListingCardView";
import { provinceName } from "@/lib/provinces";
import { publicGet } from "@/lib/server";
import type { SearchResult } from "@/lib/types";

interface Garden {
  id: string; slug: string; name: string; type: string; description?: string; address: string; provinceId: string; lat: number; lng: number;
  openingHours?: string; allowVisit: boolean; photos: string[]; cover?: string | null; ownerId: string; tick: boolean; founding: boolean;
}

const load = (slug: string) => publicGet<Garden>(`/api/gardens/${slug}`, 300);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = await load((await params).slug);
  return g ? { title: `${g.name} — ${provinceName(g.provinceId)}`, description: g.description?.slice(0, 160) } : { title: "Không tìm thấy gian hàng" };
}

export default async function GardenStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = await load((await params).slug);
  if (!g) notFound();
  const [listings, reviews] = await Promise.all([
    publicGet<SearchResult>(`/api/listings?sellerId=${g.ownerId}&pageSize=24`, 60),
    publicGet<{ score: number | null; count: number }>(`/api/users/${g.ownerId}/reviews`, 300),
  ]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {(g.cover ?? g.photos[0]) && <img src={g.cover ?? g.photos[0].replace("/card.webp", "/full.webp")} alt="" className="h-48 w-full object-cover sm:h-64" />}
        <div className="p-5">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {g.name}
            {g.tick && <span className="rounded bg-emerald-100 px-2 py-0.5 text-sm text-emerald-800">{g.type === "Garden" ? "Nhà vườn" : "Shop"}</span>}
            {g.founding && <span className="rounded bg-wood-200 px-2 py-0.5 text-sm text-wood-800">Sáng lập</span>}
          </h1>
          <p className="text-sm text-stone-600">{g.address} · {provinceName(g.provinceId)}</p>
          <p className="text-sm text-stone-600">
            {g.openingHours && `Mở cửa ${g.openingHours} · `}{g.allowVisit ? "Đón khách tham quan vườn" : "Không đón khách tham quan"}
            {reviews && ` · ${reviews.score != null ? `${reviews.score}/5 điểm` : "Chưa đủ đánh giá"} (${reviews.count})`}
          </p>
          {g.description && <p className="mt-2 whitespace-pre-line text-sm">{g.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2"><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`} className="inline-block rounded-full bg-emerald-800 px-5 py-2.5 font-bold text-stone-50">Chỉ đường</a><FollowButton sellerId={g.ownerId} /><Link href={`/nguoi-ban/${g.ownerId}`} className="text-emerald-700 hover:underline">Xem đánh giá</Link></div>
        </div>
      </div>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Tin đang bán ({listings?.total ?? 0})</h2>
        {listings && <ListingGrid items={listings.items} />}
      </section>
    </div>
  );
}
