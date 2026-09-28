import type { ListingCard } from "./types";

export const vnd = (n?: number | null) => (n == null ? "" : n.toLocaleString("vi-VN") + " đ");

export function shortVnd(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}đ`;
}

const RENT_UNIT: Record<string, string> = { Day: "ngày", Week: "tuần", Month: "tháng", TetSeason: "mùa Tết" };

export function priceLabel(l: Pick<ListingCard, "type" | "price" | "priceMode" | "priceRefMin" | "priceRefMax" | "budgetMin" | "budgetMax" | "rent">) {
  switch (l.type) {
    case "Give": return "Tặng / trao đổi";
    case "Buy": return l.budgetMax ? `Ngân sách đến ${shortVnd(l.budgetMax)}` : "Cần mua";
    case "Rent": return l.rent ? `${shortVnd(l.rent.pricePerUnit)}/${RENT_UNIT[l.rent.unit] ?? l.rent.unit}` : "Cho thuê";
    default:
      if (l.priceMode === "Negotiable") return `Thỏa thuận (${shortVnd(l.priceRefMin ?? 0)}–${shortVnd(l.priceRefMax ?? 0)})`;
      return vnd(l.price);
  }
}

export const TYPE_LABEL: Record<string, string> = { Sell: "Bán", Buy: "Cần mua", Rent: "Cho thuê", Give: "Tặng/Trao đổi" };

export function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}
