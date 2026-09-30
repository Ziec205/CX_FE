import Link from "next/link";
import { ViewTransition } from "react";
import { priceLabel, timeAgo, TYPE_LABEL } from "@/lib/format";
import { provinceName } from "@/lib/provinces";
import type { ListingCard } from "@/lib/types";

// Nền tạm khi tin chưa có ảnh: xoay vòng các tông lá và gỗ.
const TONES = ["bg-emerald-200", "bg-stone-200", "bg-emerald-100", "bg-water-100"];

/** morph: ảnh bay sang trang chi tiết khi mở tin. Tắt khi cùng tin có thể xuất hiện hai lần trên trang (khối ưu tiên) — tên view transition phải duy nhất. */
export function ListingCardView({ l, morph = true }: { l: ListingCard; morph?: boolean }) {
  const badge = l.isPriority ? "Ưu tiên" : l.type !== "Sell" ? TYPE_LABEL[l.type] : l.seller.isGarden ? "Nhà vườn" : l.realPhoto ? "Ảnh thật" : null;
  return (
    <Link href={`/tin/${l.id}`} className="cx-reveal group flex flex-col gap-2.5">
      <MaybeMorph name={morph ? `listing-${l.id}` : undefined}>
        <div className={`relative aspect-[4/5] overflow-hidden rounded-2xl ${TONES[l.id.charCodeAt(l.id.length - 1) % TONES.length]}`}>
          {l.thumbUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.thumbUrl} alt={l.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 text-xs font-bold">
            {badge && <span className={`rounded-full px-2.5 py-1 ${l.isPriority ? "bg-stone-900 text-wood-400" : "bg-white text-emerald-800"}`}>{badge}</span>}
            {l.highlight && <span className="rounded-full bg-emerald-800 px-2.5 py-1 text-stone-50">{l.highlight}</span>}
          </div>
          {l.photoCount > 1 && <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs text-stone-700">{l.photoCount} ảnh</span>}
          {/* Thẻ giá treo ở mép dưới ảnh, như thẻ buộc cành ở nhà vườn. */}
          <span className="cx-tag absolute bottom-3 left-0 text-[17px] sm:text-lg">{priceLabel(l)}</span>
        </div>
      </MaybeMorph>
      <div className="flex flex-col gap-0.5">
        <h3 className="line-clamp-2 font-sans text-base font-semibold leading-snug tracking-normal group-hover:text-emerald-700">{l.title}</h3>
        <span className="truncate text-sm text-emerald-700">{l.seller.displayName}{l.escrow && ", có giao dịch đảm bảo"}</span>
        <p className="text-sm text-stone-500">
          {provinceName(l.provinceId)}{l.distanceKm != null && ` · ${l.distanceKm} km`} · {timeAgo(l.bumpedAt)}
        </p>
      </div>
    </Link>
  );
}

function MaybeMorph({ name, children }: { name?: string; children: React.ReactNode }) {
  return name ? <ViewTransition name={name} share="morph" default="none">{children}</ViewTransition> : <>{children}</>;
}

export function ListingGrid({ items, morph = true }: { items: ListingCard[]; morph?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
      {items.map((l) => <ListingCardView key={l.id} l={l} morph={morph} />)}
    </div>
  );
}
