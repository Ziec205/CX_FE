import Link from "next/link";
import { priceLabel, timeAgo, TYPE_LABEL } from "@/lib/format";
import { provinceName } from "@/lib/provinces";
import type { ListingCard } from "@/lib/types";

// Nền tạm khi tin chưa có ảnh: xoay vòng các tông lá và gỗ.
const TONES = ["bg-emerald-300", "bg-wood-400", "bg-emerald-400", "bg-wood-200"];

export function ListingCardView({ l }: { l: ListingCard }) {
  const badge = l.isPriority ? "Ưu tiên" : l.type !== "Sell" ? TYPE_LABEL[l.type] : l.seller.isGarden ? "Nhà vườn" : l.realPhoto ? "Ảnh thật" : null;
  return (
    <Link href={`/tin/${l.id}`} className="group flex flex-col gap-3">
      <div className={`relative aspect-[4/5] overflow-hidden rounded-2xl ${TONES[l.id.charCodeAt(l.id.length - 1) % TONES.length]}`}>
        {l.thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.thumbUrl} alt={l.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 text-xs font-bold">
          {badge && <span className={`rounded-full px-2.5 py-1 ${l.isPriority ? "bg-wood-200 text-wood-800" : "bg-white text-emerald-800"}`}>{badge}</span>}
          {l.highlight && <span className="rounded-full bg-emerald-800 px-2.5 py-1 text-stone-50">{l.highlight}</span>}
        </div>
        {l.photoCount > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2 py-0.5 text-xs text-stone-700">{l.photoCount} ảnh</span>}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="truncate text-sm text-wood-600">{l.seller.displayName}{l.escrow && " · Giao dịch đảm bảo"}</span>
        <h3 className="line-clamp-2 text-base leading-snug group-hover:text-emerald-700">{l.title}</h3>
        <p className="text-xl font-bold text-emerald-800">{priceLabel(l)}</p>
        <p className="text-sm text-stone-500">
          {provinceName(l.provinceId)}{l.distanceKm != null && ` · ${l.distanceKm} km`} · {timeAgo(l.bumpedAt)}
        </p>
      </div>
    </Link>
  );
}

export function ListingGrid({ items }: { items: ListingCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
      {items.map((l) => <ListingCardView key={l.id} l={l} />)}
    </div>
  );
}
