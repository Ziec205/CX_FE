import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { priceLabel, timeAgo, TYPE_LABEL } from "@/lib/format";
import { provinceName } from "@/lib/provinces";
import { publicGet } from "@/lib/server";
import type { Category, ListingDetail, Species } from "@/lib/types";
import { ContactBox } from "./ContactBox";
import { Gallery } from "./Gallery";

async function load(id: string) {
  return publicGet<ListingDetail>(`/api/listings/${id}`, 30);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = await load((await params).id);
  if (!d) return { title: "Tin không tồn tại" };
  return { title: d.card.title, description: d.description.slice(0, 160), openGraph: { images: d.photoUrls.slice(0, 1) } };
}

const PICKUP: Record<string, string> = { PICKUP: "Đến xem / lấy tại chỗ", SELLER_DELIVERY: "Người bán giao", SELF_ARRANGED_CARRIER: "Gửi xe / chành xe" };

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await load(id);
  if (!d) notFound();
  const l = d.card;
  const [category, species] = await Promise.all([
    publicGet<Category>(`/api/categories/${l.categoryId}`, 3600),
    l.speciesId && l.speciesId !== "khac" ? publicGet<Species>(`/api/species/${l.speciesId}`, 3600) : null,
  ]);
  const attrLabel = (k: string) => category?.attributes.find((a) => a.key === k);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: l.title, image: d.photoUrls, description: d.description,
    ...(l.type === "Sell" && l.price ? { offers: { "@type": "Offer", price: l.price, priceCurrency: "VND", availability: l.status === "Active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut" } } : {}),
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="space-y-4">
        <Gallery urls={d.photoUrls} title={l.title} />
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">{TYPE_LABEL[l.type]}</span>
            {l.status === "SoldOut" && <span className="rounded-full bg-stone-200 px-3 py-1 font-bold">Đã bán hết</span>}
            {l.realPhoto && <span className="rounded-full bg-wood-100 px-3 py-1 font-bold text-wood-800">Ảnh chụp thực tế</span>}
            {l.escrow && <span className="rounded-full bg-emerald-800 px-3 py-1 font-bold text-stone-50">Giao dịch đảm bảo</span>}
          </div>
          <h1 className="text-4xl leading-tight tracking-tight text-emerald-800 lg:text-5xl">{l.title}</h1>
          <p className="text-3xl font-bold text-emerald-600">{priceLabel(l)}</p>
          {l.rent && <p className="text-sm text-stone-600">Cọc {l.rent.deposit.toLocaleString("vi-VN")}đ · thuê tối thiểu {l.rent.minUnits}</p>}
          <p className="mt-1 text-sm text-stone-500">{provinceName(l.provinceId)} · đăng {timeAgo(l.bumpedAt)} · {d.views} lượt xem</p>

          <dl className="grid rounded-2xl border border-stone-200 bg-white p-5 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {species && <div><dt className="text-stone-500">Loài</dt><dd><Link href={`/thu-vien/${species.id}`} className="text-emerald-700 hover:underline">{species.commonName}</Link></dd></div>}
            {category && <div><dt className="text-stone-500">Danh mục</dt><dd><Link href={`/tim-kiem?categoryId=${category.id}`} className="hover:underline">{category.name}</Link></dd></div>}
            {l.type !== "Buy" && <div><dt className="text-stone-500">Còn</dt><dd>{l.available} {l.unit}</dd></div>}
            {Object.entries(d.attributes).map(([k, v]) => {
              const def = attrLabel(k);
              const text = typeof v === "boolean" ? (v ? "Có" : "Không") : Array.isArray(v) ? v.join(", ") : `${v}${def?.unit ? ` ${def.unit}` : ""}`;
              return <div key={k}><dt className="text-stone-500">{def?.label ?? k}</dt><dd>{text}</dd></div>;
            })}
            {d.neededBy && <div><dt className="text-stone-500">Cần trước</dt><dd>{new Date(d.neededBy).toLocaleDateString("vi-VN")}</dd></div>}
          </dl>

          <h2 className="text-3xl text-emerald-800">Mô tả</h2>
          <p className="whitespace-pre-line text-base leading-relaxed text-stone-700">{d.description}</p>
          {d.wantInExchange && <p className="mt-2 text-sm"><b>Muốn đổi lấy:</b> {d.wantInExchange}</p>}
          <p className="mt-3 text-sm"><b>Hình thức nhận:</b> {d.pickupOptions.map((p) => PICKUP[p] ?? p).join(" · ")}</p>
        </div>

        {species && (
          <div className="rounded-2xl bg-emerald-50 p-6 text-[15px]">
            <h2 className="mb-3 text-2xl text-emerald-800">Về cây {species.commonName}{species.scientificName && <i className="font-normal text-stone-500"> ({species.scientificName})</i>}</h2>
            <ul className="space-y-1">
              {species.aliases.length > 0 && <li>Tên khác: {species.aliases.join(", ")}</li>}
              {species.light && <li>Ánh sáng: {species.light}</li>}
              {species.difficulty && <li>Độ khó: {species.difficulty}/5</li>}
              {species.petToxicity && <li>Thú cưng: {species.petToxicity}</li>}
            </ul>
          </div>
        )}
      </div>

      <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
        <ContactBox listing={l} isOwner={d.isOwner} />
        <div className="rounded-2xl bg-wood-100 p-6 text-[15px] text-wood-800">
          <p className="mb-2 text-xl italic">Mua bán an toàn</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Xem cây tận mắt trước khi trả tiền, hoặc chọn tin có <b>Giao dịch đảm bảo</b>.</li>
            <li>Không chuyển cọc cho người lạ, không đọc mã OTP cho bất kỳ ai.</li>
            <li>Quay video khi mở hàng để làm bằng chứng nếu cây hỏng.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
