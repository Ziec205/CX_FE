"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PhotoPicker, type UploadedPhoto } from "@/components/PhotoPicker";
import { ProfileGate } from "@/components/ProfileGate";
import { Alert, btn, field, Label } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { priceLabel } from "@/lib/format";
import { MAX_USES_PER_LISTING, PLANT_USES } from "@/lib/plantUses";
import { provinceName, PROVINCES } from "@/lib/provinces";
import type { AttributeDefinition, Category, CategoryTree, ListingDetail, Me, Species } from "@/lib/types";

type ListingType = "Sell" | "Buy" | "Rent" | "Give";
const TYPES: [ListingType, string, string][] = [
  ["Sell", "Bán", "Cây, chậu, vật tư"], ["Buy", "Cần mua", "Nhận báo giá từ người bán"],
  ["Rent", "Cho thuê", "Cây Tết, sự kiện, văn phòng"], ["Give", "Tặng / đổi", "Cho cây con, đổi cây"],
];
const PICKUPS: [string, string][] = [["PICKUP", "Đến xem, lấy tại chỗ"], ["SELLER_DELIVERY", "Tôi giao được"], ["SELF_ARRANGED_CARRIER", "Gửi xe, chành xe"]];
const UNITS = ["cây", "chậu", "bầu", "cành", "gói hạt", "kg", "bao", "bộ"];
const RENT_UNITS: [string, string][] = [["Day", "ngày"], ["Week", "tuần"], ["Month", "tháng"], ["TetSeason", "mùa Tết"]];
const VERIFY_THRESHOLD = 20_000_000;
const TITLE_MIN = 10, TITLE_MAX = 70, DESC_MIN = 20, DESC_MAX = 3000;

export default function PostListingPage() {
  return <Suspense><PostListingForm /></Suspense>;
}

/** Ô tiền: người dùng gõ số, hiển thị có dấu chấm hàng nghìn; state giữ chuỗi chữ số thuần. */
function MoneyInput({ value, onChange, id, required, placeholder, suffix = "đ", ...rest }: {
  value: string; onChange: (digits: string) => void; id?: string; required?: boolean; placeholder?: string; suffix?: string; "aria-label"?: string;
}) {
  return (
    <div className="relative">
      <input id={id} inputMode="numeric" required={required} placeholder={placeholder} aria-label={rest["aria-label"]}
        value={value ? Number(value).toLocaleString("vi-VN") : ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12))}
        className={`${field} pr-10 font-semibold`} />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-500">{suffix}</span>
    </div>
  );
}

/** Khối form có đánh số: các bước đăng tin thực sự là một trình tự. */
function Step({ n, title, hint, id, children }: { n: number; title: string; hint?: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-40 rounded-3xl bg-white p-5 ring-1 ring-stone-200 sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-800 font-display font-bold text-white">{n}</span>
        <div>
          <h2 id={`${id}-t`} className="text-2xl font-bold text-emerald-900">{title}</h2>
          {hint && <p className="mt-1 text-sm text-stone-600">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const chip = (on: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors disabled:opacity-40 ${on ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white text-stone-700 ring-stone-300 hover:ring-emerald-700"}`;

/** Đăng tin mới, hoặc sửa tin khi có ?id=… (loại tin không đổi được — BR, xem ListingService.UpdateAsync). */
function PostListingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const [notice, setNotice] = useState<string>();
  const [me, setMe] = useState<Me>();
  const [tree, setTree] = useState<CategoryTree[]>([]);
  const [type, setType] = useState<ListingType>("Sell");
  const [rootId, setRootId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [category, setCategory] = useState<Category>();
  const [species, setSpecies] = useState<{ id: string; name: string }>();
  const [title, setTitle] = useState(params.get("title") ?? "");
  const [description, setDescription] = useState("");
  const [priceMode, setPriceMode] = useState<"Fixed" | "Negotiable">("Fixed");
  const [price, setPrice] = useState("");
  const [refMin, setRefMin] = useState("");
  const [refMax, setRefMax] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [rent, setRent] = useState({ unit: "Month", pricePerUnit: "", deposit: "", minUnits: "1" });
  const [wantInExchange, setWant] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("cây");
  const [attrs, setAttrs] = useState<Record<string, unknown>>({});
  const [uses, setUses] = useState<string[]>([]);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [verification, setVerification] = useState<UploadedPhoto[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>();
  const [locating, setLocating] = useState(false);
  const [pickup, setPickup] = useState<string[]>(["PICKUP"]);
  const [escrow, setEscrow] = useState(false);
  const [error, setError] = useState<string[]>();
  const [busy, setBusy] = useState(false);
  const [pendingAttrs, setPendingAttrs] = useState<Record<string, unknown>>();
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<Me>("me"), api<CategoryTree[]>("categories")]).then(([m, t]) => {
      if (cancelled) return;
      setMe(m); setTree(t);
      if (!editId) setProvinceId(m.provinceId ?? "");
    }, (e) => { if (!cancelled) setError([errorText(e)]); });
    return () => { cancelled = true; };
  }, [editId]);

  // Chế độ sửa: nạp tin hiện tại (qua BFF nên chủ tin xem được cả tin chưa hiển thị).
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    api<ListingDetail>(`listings/${editId}`).then((d) => {
      if (cancelled) return;
      if (!d.isOwner) { setError(["Bạn không phải chủ tin này"]); return; }
      const c = d.card;
      setType(c.type); setCategoryId(c.categoryId); setTitle(c.title); setDescription(d.description);
      if (c.speciesId === "khac") setSpecies({ id: "khac", name: "Khác / không rõ" });
      else if (c.speciesId) api<Species>(`species/${c.speciesId}`).then((s) => { if (!cancelled) setSpecies({ id: s.id, name: s.commonName }); }, () => {});
      setPriceMode(c.priceMode === "Negotiable" ? "Negotiable" : "Fixed");
      setPrice(c.price ? String(c.price) : ""); setRefMin(c.priceRefMin ? String(c.priceRefMin) : ""); setRefMax(c.priceRefMax ? String(c.priceRefMax) : "");
      setBudgetMin(c.budgetMin ? String(c.budgetMin) : ""); setBudgetMax(c.budgetMax ? String(c.budgetMax) : "");
      setNeededBy(d.neededBy ? d.neededBy.slice(0, 10) : "");
      if (c.rent) setRent({ unit: c.rent.unit, pricePerUnit: String(c.rent.pricePerUnit), deposit: String(c.rent.deposit), minUnits: String(c.rent.minUnits) });
      setWant(d.wantInExchange ?? ""); setQuantity(String(d.quantity)); setUnit(c.unit); setProvinceId(c.provinceId);
      setPickup(d.pickupOptions); setEscrow(c.escrow); setUses(d.uses ?? []);
      if (d.lat != null && d.lng != null) setCoords({ lat: d.lat, lng: d.lng });
      setPhotos(d.photoUrls.map((u) => ({ id: u.split("/")[2], preview: u.replace("/full.webp", "/thumb.webp") })));
      setPendingAttrs(d.attributes);
    }, (e) => { if (!cancelled) setError([errorText(e)]); });
    return () => { cancelled = true; };
  }, [editId]);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    api<Category>(`categories/${categoryId}`).then((c) => {
      if (cancelled) return;
      setCategory(c);
      // Khi sửa tin, giữ lại thuộc tính đã có của danh mục ban đầu; đổi danh mục thì xóa.
      setAttrs(pendingAttrs ?? {});
      setPendingAttrs(undefined);
      if (!c.allowNegotiablePrice) setPriceMode("Fixed");
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pendingAttrs chỉ đọc một lần khi nạp tin để sửa
  }, [categoryId]);

  // Danh mục cha đang chọn: theo nút người dùng bấm, hoặc suy ra từ danh mục con (khi sửa tin).
  const root = tree.find((c) => c.id === rootId) ?? tree.find((c) => c.children.some((s) => s.id === categoryId));

  const effectivePrice = type === "Sell" ? Number(priceMode === "Negotiable" ? refMax : price) || 0 : 0;
  const needsVerification = type === "Sell" && effectivePrice >= VERIFY_THRESHOLD;
  const minPhotos = type === "Buy" ? 0 : 1;
  const visibleAttrs = useMemo(() => [...(category?.attributes ?? [])].sort((a, b) => (a.required === b.required ? 0 : a.required ? -1 : 1)), [category]);

  const priceReady = type === "Sell" ? (priceMode === "Fixed" ? Number(price) >= 1000 : !!refMin && !!refMax)
    : type === "Rent" ? Number(rent.pricePerUnit) >= 1000 : true;
  const checklist: [string, boolean, string][] = [
    ...(minPhotos > 0 ? [[`Ít nhất ${minPhotos} ảnh`, photos.length >= minPhotos, "b-anh"] as [string, boolean, string]] : []),
    ["Chọn danh mục", !!categoryId, "b-cay"],
    [`Tiêu đề từ ${TITLE_MIN} ký tự`, title.trim().length >= TITLE_MIN, "b-cay"],
    [`Mô tả từ ${DESC_MIN} ký tự`, description.trim().length >= DESC_MIN, "b-cay"],
    [type === "Buy" ? "Ngân sách (không bắt buộc)" : "Giá", priceReady, "b-gia"],
    ...(type !== "Buy" ? visibleAttrs.filter((a) => a.required).map((a) => {
      const v = attrs[a.key];
      return [a.label, v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0), "b-cay"] as [string, boolean, string];
    }) : []),
    ["Tỉnh / thành", !!provinceId, "b-noi"],
    ...(needsVerification ? [["Ảnh xác minh (tin từ 20 triệu)", verification.length > 0, "b-anh"] as [string, boolean, string]] : []),
  ];
  const remaining = checklist.filter(([, ok]) => !ok).length;

  if (!me) return error ? <Alert>{error[0]}</Alert> : <div className="mx-auto max-w-3xl space-y-4">{[0, 1, 2].map((i) => <div key={i} className="cx-shimmer h-40 rounded-3xl" />)}</div>;
  if (!me.canPost) return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-4xl font-extrabold text-emerald-900">Đăng tin</h1>
      <ProfileGate me={me} onDone={(m) => { setMe(m); setProvinceId(m.provinceId ?? ""); }} />
    </div>
  );

  function locate() {
    if (!navigator.geolocation) return setError(["Trình duyệt này không hỗ trợ lấy vị trí. Tin vẫn đăng được, chỉ không hiện trên bản đồ."]);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { setLocating(false); setError(["Không lấy được vị trí. Kiểm tra quyền vị trí của trình duyệt, hoặc bỏ qua bước này."]); },
      { timeout: 10000 },
    );
  }

  const num = (s: string) => (s === "" ? null : Number(s));
  const showErrors = (list: string[]) => { setError(list); requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined); setNotice(undefined);
    const problems = checklist.filter(([, ok]) => !ok).map(([label]) => label);
    if (type === "Sell" && priceMode === "Negotiable" && Number(refMin) > Number(refMax)) problems.push("Khoảng giá: số \"từ\" phải nhỏ hơn số \"đến\"");
    if (problems.length) return showErrors(problems.map((p) => `Còn thiếu: ${p.toLowerCase()}`));

    setBusy(true);
    const listing = {
      type, categoryId, speciesId: species?.id ?? null, title: title.trim(), description: description.trim(),
      price: type === "Sell" && priceMode === "Fixed" ? num(price) : type === "Give" ? 0 : null,
      priceMode: type === "Sell" ? priceMode : "Fixed", priceNegotiable: negotiable,
      priceRefMin: priceMode === "Negotiable" ? num(refMin) : null, priceRefMax: priceMode === "Negotiable" ? num(refMax) : null,
      budgetMin: type === "Buy" ? num(budgetMin) : null, budgetMax: type === "Buy" ? num(budgetMax) : null,
      neededBy: type === "Buy" && neededBy ? new Date(neededBy).toISOString() : null,
      rent: type === "Rent" ? { unit: rent.unit, pricePerUnit: Number(rent.pricePerUnit), deposit: Number(rent.deposit || 0), minUnits: Number(rent.minUnits || 1) } : null,
      wantInExchange: type === "Give" ? wantInExchange : null,
      quantity: Number(quantity) || 1, unit, attributes: attrs, uses, provinceId, lat: coords?.lat ?? null, lng: coords?.lng ?? null,
      pickupOptions: pickup, escrowEnabled: escrow, mediaIds: photos.map((p) => p.id), verificationMediaId: verification[0]?.id ?? null,
    };
    try {
      if (editId) {
        const r = await api<{ id: string; status: string; pendingRevision?: unknown }>(`listings/${editId}`, { method: "PUT", json: { listing, submit: true } });
        if (r.pendingRevision) {
          setNotice("Đã lưu. Thay đổi về ảnh, tiêu đề hoặc loài đang chờ duyệt; tin cũ vẫn hiển thị trong lúc chờ.");
          setBusy(false);
        } else router.push(r.status === "Active" ? `/tin/${r.id}` : "/tai-khoan");
        return;
      }
      const r = await api<{ id: string; status: string; rejectReason?: string }>("listings", { method: "POST", json: { listing, submit: true } });
      if (r.status === "Active") router.push(`/tin/${r.id}`);
      else router.push(`/tai-khoan?posted=${r.status}`);
    } catch (err) {
      const d = (err as ApiError).details;
      showErrors(Array.isArray(d) ? d.map((x) => (x as { message: string }).message) : [errorText(err)]);
      setBusy(false);
    }
  }

  const preview = priceLabel({
    type, price: Number(price) || null, priceMode, priceRefMin: Number(refMin) || null, priceRefMax: Number(refMax) || null,
    budgetMin: Number(budgetMin) || null, budgetMax: Number(budgetMax) || null,
    rent: type === "Rent" && rent.pricePerUnit ? { unit: rent.unit, pricePerUnit: Number(rent.pricePerUnit), deposit: 0, minUnits: 1 } : null,
  } as Parameters<typeof priceLabel>[0]);
  const noPrice = (type === "Sell" || type === "Rent") && !priceReady;
  const submitLabel = busy ? "Đang lưu…" : editId ? "Lưu thay đổi" : "Đăng tin";

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-4xl font-extrabold text-emerald-900 sm:text-5xl">{editId ? "Sửa tin" : "Đăng tin"}</h1>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <Step n={1} id="b-loai" title="Bạn muốn làm gì?" hint={editId ? "Không đổi được loại tin sau khi đăng." : undefined}>
            <div role="radiogroup" aria-label="Loại tin" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPES.map(([v, l, d]) => (
                <button type="button" role="radio" aria-checked={type === v} key={v} onClick={() => setType(v)} disabled={!!editId && v !== type}
                  className={`rounded-2xl p-3.5 text-left ring-1 disabled:opacity-40 ${type === v ? "bg-emerald-50 ring-2 ring-emerald-700" : "bg-white ring-stone-300 hover:ring-emerald-700"}`}>
                  <span className="block font-display text-lg font-bold">{l}</span>
                  <span className="block text-sm text-stone-600">{d}</span>
                </button>
              ))}
            </div>
          </Step>

          {type !== "Buy" && (
            <Step n={2} id="b-anh" title="Ảnh cây" hint={`Ảnh đầu tiên là ảnh bìa trên chợ. Chụp đủ sáng, thấy rõ lá, thân và chậu. Tối đa 12 ảnh.`}>
              <PhotoPicker value={photos} onChange={setPhotos} camera={false} />
              {needsVerification && (
                <div className="mt-5 rounded-2xl bg-wood-100 p-4 ring-1 ring-wood-200">
                  <p className="mb-2 text-sm text-wood-800"><b>Ảnh xác minh</b>, bắt buộc với tin từ 20 triệu: chụp cây kèm tờ giấy ghi <b>tên tài khoản &ldquo;{me.displayName}&rdquo;</b> và <b>ngày hôm nay</b>. Ảnh này không hiển thị công khai.</p>
                  <PhotoPicker value={verification} onChange={setVerification} max={1} label="Chọn ảnh" />
                </div>
              )}
            </Step>
          )}

          <Step n={type === "Buy" ? 2 : 3} id="b-cay" title={type === "Buy" ? "Bạn cần mua gì?" : "Thông tin cây"}>
            <div className="space-y-5">
              <div role="group" aria-labelledby="cat-label">
                <span id="cat-label" className="mb-2 block font-semibold text-stone-800">Danh mục <span className="text-red-700">*</span></span>
                <div className="flex flex-wrap gap-2">
                  {tree.map((c) => (
                    <button type="button" key={c.id} aria-pressed={root?.id === c.id}
                      onClick={() => { setRootId(c.id); if (!c.children.some((s) => s.id === categoryId)) { setCategoryId(""); setCategory(undefined); setSpecies(undefined); } }}
                      className={chip(root?.id === c.id)}>{c.name}</button>
                  ))}
                </div>
                {root && (
                  <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-stone-50 p-3">
                    {root.children.map((s) => (
                      <button type="button" key={s.id} aria-pressed={categoryId === s.id} onClick={() => { setCategoryId(s.id); setSpecies(undefined); }}
                        className={`rounded-full px-3.5 py-1.5 text-sm ring-1 ${categoryId === s.id ? "bg-wood-400 font-semibold text-stone-900 ring-wood-400" : "bg-white ring-stone-300 hover:ring-emerald-700"}`}>{s.name}</button>
                    ))}
                  </div>
                )}
              </div>
              {category?.requiresManualReview && <Alert kind="warn">Danh mục hàng hạn chế: người duyệt sẽ kiểm tra giấy tờ trước khi tin hiển thị.</Alert>}

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor="f-title" className="font-semibold text-stone-800">Tiêu đề <span className="text-red-700">*</span></label>
                  <span className={`text-sm ${title.length > 0 && title.trim().length < TITLE_MIN ? "text-red-700" : "text-stone-500"}`}>{title.length}/{TITLE_MAX}</span>
                </div>
                <input id="f-title" required minLength={TITLE_MIN} maxLength={TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} className={field}
                  placeholder="Vd: Sen đá kim tuyến chậu 10cm, lên màu đẹp" />
                <p className="mt-1 text-sm text-stone-500">Ghi tên cây, kích thước, điểm nổi bật. Không ghi số điện thoại.</p>
              </div>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor="f-desc" className="font-semibold text-stone-800">Mô tả <span className="text-red-700">*</span></label>
                  <span className={`text-sm ${description.length > 0 && description.trim().length < DESC_MIN ? "text-red-700" : "text-stone-500"}`}>{description.length}/{DESC_MAX}</span>
                </div>
                <textarea id="f-desc" required minLength={DESC_MIN} maxLength={DESC_MAX} rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className={field}
                  placeholder={"Tình trạng cây, tuổi cây, chiều cao, cách chăm…\nNgười mua liên hệ qua nút Nhắn tin hoặc Hiện số, nên không cần ghi SĐT hay link."} />
              </div>

              {visibleAttrs.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {visibleAttrs.map((a) => <AttributeInput key={a.key} def={a} value={attrs[a.key]} required={a.required && type !== "Buy"} onChange={(v) => setAttrs({ ...attrs, [a.key]: v })} />)}
                </div>
              )}

              <div role="group" aria-labelledby="uses-label">
                <span id="uses-label" className="mb-1 block font-semibold text-stone-800">Công dụng</span>
                <p className="mb-2 text-sm text-stone-500">Chọn tối đa {MAX_USES_PER_LISTING}, giúp người mua lọc ra tin của bạn trên Chợ cây.</p>
                <div className="flex flex-wrap gap-2">
                  {PLANT_USES.map((u) => {
                    const on = uses.includes(u);
                    return (
                      <button key={u} type="button" aria-pressed={on} disabled={!on && uses.length >= MAX_USES_PER_LISTING}
                        onClick={() => setUses(on ? uses.filter((x) => x !== u) : [...uses, u])} className={chip(on)}>{u}</button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Step>

          <Step n={type === "Buy" ? 3 : 4} id="b-gia" title={type === "Buy" ? "Ngân sách" : type === "Give" ? "Trao đổi & số lượng" : "Giá & số lượng"}>
            <div className="grid gap-4 sm:grid-cols-2">
              {type === "Sell" && (
                <>
                  {category?.allowNegotiablePrice && (
                    <div role="radiogroup" aria-label="Cách báo giá" className="flex gap-2 sm:col-span-2">
                      {([["Fixed", "Ghi giá cụ thể"], ["Negotiable", "Giá thỏa thuận"]] as const).map(([v, l]) => (
                        <button type="button" role="radio" aria-checked={priceMode === v} key={v} onClick={() => setPriceMode(v)} className={chip(priceMode === v)}>{l}</button>
                      ))}
                    </div>
                  )}
                  {priceMode === "Fixed" ? (
                    <div>
                      <label htmlFor="f-price" className="mb-1.5 block font-semibold text-stone-800">Giá bán <span className="text-red-700">*</span></label>
                      <MoneyInput id="f-price" required value={price} onChange={setPrice} placeholder="Vd: 350.000" />
                      <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="h-4 w-4 accent-emerald-700" />Cho phép người mua trả giá</label>
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <span className="mb-1.5 block font-semibold text-stone-800">Khoảng giá tham khảo <span className="text-red-700">*</span></span>
                      <div className="grid grid-cols-2 gap-2">
                        <MoneyInput aria-label="Giá từ" value={refMin} onChange={setRefMin} placeholder="Từ" />
                        <MoneyInput aria-label="Giá đến" value={refMax} onChange={setRefMax} placeholder="Đến" />
                      </div>
                      <p className="mt-1 text-sm text-stone-500">Hiện trên tin dạng &ldquo;Thỏa thuận&rdquo; kèm khoảng giá, và dùng cho bộ lọc giá.</p>
                    </div>
                  )}
                </>
              )}
              {type === "Buy" && (
                <>
                  <div className="sm:col-span-2">
                    <span className="mb-1.5 block font-semibold text-stone-800">Ngân sách</span>
                    <div className="grid grid-cols-2 gap-2">
                      <MoneyInput aria-label="Ngân sách từ" value={budgetMin} onChange={setBudgetMin} placeholder="Từ" />
                      <MoneyInput aria-label="Ngân sách đến" value={budgetMax} onChange={setBudgetMax} placeholder="Đến" />
                    </div>
                  </div>
                  <Label text="Cần hàng trước ngày" hint="Tối đa 30 ngày tới"><input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className={field} /></Label>
                </>
              )}
              {type === "Rent" && (
                <>
                  <div>
                    <label htmlFor="f-rent" className="mb-1.5 block font-semibold text-stone-800">Giá thuê <span className="text-red-700">*</span></label>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <MoneyInput id="f-rent" required value={rent.pricePerUnit} onChange={(v) => setRent({ ...rent, pricePerUnit: v })} />
                      <select aria-label="Tính theo" value={rent.unit} onChange={(e) => setRent({ ...rent, unit: e.target.value })} className={`${field} w-auto`}>
                        {RENT_UNITS.map(([v, l]) => <option key={v} value={v}>/{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="f-deposit" className="mb-1.5 block font-semibold text-stone-800">Tiền cọc</label>
                    <MoneyInput id="f-deposit" value={rent.deposit} onChange={(v) => setRent({ ...rent, deposit: v })} placeholder="0" />
                  </div>
                  <Label text={`Thuê tối thiểu (số ${RENT_UNITS.find(([v]) => v === rent.unit)?.[1] ?? "kỳ"})`}>
                    <input type="number" min={1} value={rent.minUnits} onChange={(e) => setRent({ ...rent, minUnits: e.target.value })} className={field} />
                  </Label>
                </>
              )}
              {type === "Give" && (
                <div className="sm:col-span-2"><Label text="Muốn đổi lấy gì (nếu có)"><input value={wantInExchange} onChange={(e) => setWant(e.target.value)} className={field} placeholder="Vd: đổi lấy sen đá khác, hoặc để trống nếu tặng" /></Label></div>
              )}
              <div>
                <span className="mb-1.5 block font-semibold text-stone-800">Số lượng</span>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input type="number" min={1} aria-label="Số lượng" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={field} />
                  <select aria-label="Đơn vị" value={unit} onChange={(e) => setUnit(e.target.value)} className={`${field} w-auto`}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Step>

          <Step n={type === "Buy" ? 4 : 5} id="b-noi" title="Khu vực & giao nhận">
            <div className="grid gap-4 sm:grid-cols-2">
              <Label text="Tỉnh / thành" required>
                <select required value={provinceId} onChange={(e) => setProvinceId(e.target.value)} className={field}>
                  <option value="">Chọn tỉnh / thành</option>{PROVINCES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Label>
              <div>
                <span className="mb-1.5 block font-semibold text-stone-800">Vị trí trên bản đồ</span>
                {coords ? (
                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm">
                    <span className="text-emerald-900">Đã lấy vị trí ({coords.lat.toFixed(3)}, {coords.lng.toFixed(3)})</span>
                    <button type="button" onClick={() => setCoords(undefined)} className="font-semibold text-emerald-800 underline">Bỏ</button>
                  </div>
                ) : (
                  <button type="button" onClick={locate} disabled={locating} className={`${btn.secondary} w-full`}>{locating ? "Đang lấy vị trí…" : "Dùng vị trí hiện tại"}</button>
                )}
                <p className="mt-1 text-sm text-stone-500">{me.flags.hasActivePlan ? "Nhà vườn/Shop: hiện đúng vị trí vườn." : "Người bán cá nhân: vị trí được làm tròn khoảng 1 km để giữ kín địa chỉ nhà."}</p>
              </div>
            </div>
            <div role="group" aria-labelledby="pickup-label" className="mt-5">
              <span id="pickup-label" className="mb-2 block font-semibold text-stone-800">Cách giao nhận</span>
              <div className="flex flex-wrap gap-2">
                {PICKUPS.map(([v, l]) => {
                  const on = pickup.includes(v);
                  return <button type="button" key={v} aria-pressed={on} onClick={() => setPickup(on ? pickup.filter((x) => x !== v) : [...pickup, v])} className={chip(on)}>{l}</button>;
                })}
              </div>
            </div>
            {type === "Sell" && me.flags.hasVerifiedGarden && (
              <label className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
                <input type="checkbox" checked={escrow} onChange={(e) => setEscrow(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" />
                <span><b className="block">Nhận Giao dịch đảm bảo</b><span className="text-sm text-stone-600">Chạm Xanh giữ tiền của người mua đến khi họ nhận cây, rồi mới chuyển cho bạn.</span></span>
              </label>
            )}
          </Step>

          <div ref={errorRef} className="space-y-3">
            {error && <Alert><ul className="list-disc space-y-0.5 pl-4">{error.map((e) => <li key={e}>{e}</li>)}</ul></Alert>}
            {notice && <Alert kind="ok">{notice}</Alert>}
          </div>
        </div>

        {/* Xem trước + việc còn thiếu. Điện thoại: nằm cuối form, nút đăng dính dưới đáy. */}
        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <div className="rounded-3xl bg-white p-4 ring-1 ring-stone-200">
            <p className="mb-3 text-sm font-semibold text-stone-600">Tin sẽ hiện trên chợ như thế này</p>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-emerald-100">
              {photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos[0].preview} alt="" className="h-full w-full object-cover" />
              ) : <p className="flex h-full items-center justify-center p-6 text-center text-sm text-emerald-800">{type === "Buy" ? "Tin cần mua không cần ảnh" : "Ảnh bìa sẽ hiện ở đây"}</p>}
              <span className={`cx-tag absolute bottom-3 left-0 text-lg ${noPrice ? "opacity-50" : ""}`}>{noPrice ? "Chưa có giá" : preview || "Chưa có giá"}</span>
            </div>
            <p className={`mt-2.5 line-clamp-2 font-semibold leading-snug ${title ? "" : "text-stone-400"}`}>{title || "Tiêu đề tin"}</p>
            <p className="text-sm text-emerald-700">{me.displayName}</p>
            <p className="text-sm text-stone-500">{provinceId ? provinceName(provinceId) : "Chưa chọn tỉnh"}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 ring-1 ring-stone-200">
            <p className="mb-2 font-display text-lg font-bold">{remaining === 0 ? "Đủ thông tin để đăng" : `Còn ${remaining} mục cần điền`}</p>
            <ul className="space-y-1.5 text-sm">
              {checklist.map(([label, ok, target]) => (
                <li key={label}>
                  <a href={`#${target}`} className={`flex items-center gap-2 ${ok ? "text-stone-500" : "font-medium text-stone-900 hover:text-emerald-700"}`}>
                    <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${ok ? "bg-emerald-700 text-white" : "ring-2 ring-stone-300"}`}>{ok ? "✓" : ""}</span>
                    <span className={ok ? "line-through decoration-stone-300" : ""}>{label}</span>
                    <span className="sr-only">{ok ? "(đã xong)" : "(chưa xong)"}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="fixed inset-x-0 bottom-16 z-20 border-t border-stone-200 bg-white/95 p-3 backdrop-blur md:bottom-0 lg:static lg:border-0 lg:bg-transparent lg:p-0">
            <button disabled={busy} className={`${btn.primary} w-full py-3.5 text-base`}>{submitLabel}</button>
            <p className="mt-2 hidden text-center text-sm text-stone-500 lg:block">Tin được kiểm tra tự động. Một số tin cần người duyệt, thường dưới 2 giờ trong khung 7h–22h.</p>
          </div>
        </aside>
      </div>
      {/* Chừa chỗ cho thanh nút đăng dính dưới đáy trên điện thoại. */}
      <div className="h-20 lg:hidden" />
    </form>
  );
}

function AttributeInput({ def, value, required, onChange }: { def: AttributeDefinition; value: unknown; required: boolean; onChange: (v: unknown) => void }) {
  const label = `${def.label}${def.unit ? ` (${def.unit})` : ""}`;
  switch (def.type) {
    case "Number":
      return <Label text={label} required={required}><input type="number" required={required} min={def.min ?? undefined} max={def.max ?? undefined} step="any"
        value={(value as number | undefined) ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} className={field} /></Label>;
    case "SingleSelect":
      return <Label text={label} required={required}><select required={required} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className={field}>
        <option value="">Chọn</option>{def.options.map((o) => <option key={o}>{o}</option>)}</select></Label>;
    case "MultiSelect": {
      // Không bọc trong <label>: bấm vào chữ sẽ bật nhầm ô đầu tiên.
      const arr = (value as string[]) ?? [];
      return (
        <div role="group" aria-label={label} className="sm:col-span-2">
          <span className="mb-1.5 block font-semibold text-stone-800">{label}{required && <span className="text-red-700"> *</span>}</span>
          <div className="flex flex-wrap gap-2">{def.options.map((o) => {
            const on = arr.includes(o);
            return <button type="button" key={o} aria-pressed={on} onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])} className={chip(on)}>{o}</button>;
          })}</div>
        </div>
      );
    }
    case "Boolean":
      return <label className="flex items-center gap-2 self-end rounded-2xl px-1 py-2.5 text-[15px]"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-emerald-700" />{def.label}</label>;
    default:
      return <Label text={label} required={required}><input required={required} maxLength={200} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className={field} /></Label>;
  }
}
