import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/FollowButton";
import { ListingGrid } from "@/components/ListingCardView";
import { provinceName } from "@/lib/provinces";
import { responseText } from "@/lib/search";
import { publicGet } from "@/lib/server";
import type { SearchResult } from "@/lib/types";
import { ReviewBox, type ReviewList } from "./ReviewBox";

interface PublicUser { id: string; displayName: string; provinceId?: string | null; flags: { hasVerifiedGarden: boolean; hasActivePlan: boolean; isProSeller: boolean }; createdAt: string }
interface Stats { responseRate?: number | null; avgResponseMinutes?: number | null; sample: number }

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const u = await publicGet<PublicUser>(`/api/users/${(await params).id}`, 300);
  return u ? { title: `${u.displayName} — người bán` } : {};
}

export default async function SellerPage({ params }: Props) {
  const { id } = await params;
  const [user, reviews, stats, listings, followers] = await Promise.all([
    publicGet<PublicUser>(`/api/users/${id}`, 300),
    publicGet<ReviewList>(`/api/users/${id}/reviews`, 60),
    publicGet<Stats>(`/api/users/${id}/response-stats`, 300),
    publicGet<SearchResult>(`/api/listings?sellerId=${id}&pageSize=24`, 60),
    publicGet<{ count: number }>(`/api/users/${id}/followers/count`, 60),
  ]);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="space-y-1">
          <h1 className="text-3xl text-emerald-800">{user.displayName}</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            {user.flags.hasVerifiedGarden ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800">Nhà vườn/Shop đã xác minh</span>
              : user.flags.isProSeller ? <span className="rounded bg-stone-100 px-2 py-0.5">Bán chuyên</span>
              : <span className="rounded bg-stone-100 px-2 py-0.5">Cá nhân</span>}
            {user.provinceId && <span className="text-stone-600">{provinceName(user.provinceId)}</span>}
            <span className="text-stone-600">Tham gia {new Date(user.createdAt).toLocaleDateString("vi-VN")}</span>
          </div>
          <p className="text-sm text-stone-600">{responseText(stats)} · {followers?.count ?? 0} người theo dõi</p>
          <p className="text-sm">
            {reviews?.score != null ? <><b className="text-lg text-emerald-800">{reviews.score}/5</b> từ {reviews.count} đánh giá ({reviews.purchased} đã mua hàng)</> : `Chưa đủ đánh giá (${reviews?.count ?? 0})`}
          </p>
        </div>
        <FollowButton sellerId={id} />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl text-emerald-800">Tin đang đăng ({listings?.total ?? 0})</h2>
        {listings && listings.items.length > 0 ? <ListingGrid items={listings.items} /> : <p className="text-stone-500">Chưa có tin nào.</p>}
      </section>

      <ReviewBox sellerId={id} initial={reviews} />
    </div>
  );
}
