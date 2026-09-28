const NUM = new Set(["priceMin", "priceMax", "lat", "lng", "radiusKm"]);
const BOOL = new Set(["gardenOnly", "escrowOnly", "realPhotoOnly"]);

/** Tham số URL trang tìm kiếm → ListingQuery để lưu tìm kiếm (03 §5.4). */
export function paramsToSavedQuery(params: Record<string, string>) {
  const query: Record<string, unknown> = { page: 1, pageSize: 24 };
  const attr: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === "page" || k === "pageSize" || v === "") continue;
    if (k.startsWith("attr.")) attr[k.slice(5)] = v;
    else query[k] = NUM.has(k) ? Number(v) : BOOL.has(k) ? v === "true" : v;
  }
  if (Object.keys(attr).length) query.attr = attr;
  return query;
}

/** Tìm kiếm đã lưu → đường dẫn trang tìm kiếm (ngược của paramsToSavedQuery). */
export function savedQueryToHref(q: Record<string, unknown>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v == null || v === "" || k === "page" || k === "pageSize") continue;
    if (k === "attr" && typeof v === "object") for (const [ak, av] of Object.entries(v as Record<string, string>)) p.set(`attr.${ak}`, av);
    else p.set(k, String(v));
  }
  return `/tim-kiem?${p}`;
}

/** Tỉ lệ + thời gian phản hồi của người bán dạng chữ. */
export function responseText(s?: { responseRate?: number | null; avgResponseMinutes?: number | null } | null) {
  if (!s || s.responseRate == null) return "Chưa đủ dữ liệu phản hồi";
  const m = s.avgResponseMinutes ?? 0;
  const t = m < 60 ? `${Math.round(m)} phút` : m < 1440 ? `${Math.round(m / 60)} giờ` : `${Math.round(m / 1440)} ngày`;
  return `Phản hồi ${Math.round(s.responseRate * 100)}% tin nhắn · thường trong ${t}`;
}

/** Tách đoạn văn (cách nhau bởi dòng trống) cho bài Khám phá / Thư viện. */
export const paragraphs = (text?: string | null) => (text ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** Tách chủ đề nhập tay "bonsai, sen đá" → mảng, bỏ trống và trùng. */
export const splitTopics = (s: string) => [...new Set(s.split(",").map((t) => t.trim()).filter(Boolean))];
