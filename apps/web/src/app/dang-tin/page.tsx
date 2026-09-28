"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { PhotoPicker, type UploadedPhoto } from "@/components/PhotoPicker";
import { ProfileGate } from "@/components/ProfileGate";
import { Alert, btn, field, Label, Section } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { MAX_USES_PER_LISTING, PLANT_USES } from "@/lib/plantUses";
import { PROVINCES } from "@/lib/provinces";
import type { AttributeDefinition, Category, CategoryTree, ListingDetail, Me, Species } from "@/lib/types";

type ListingType = "Sell" | "Buy" | "Rent" | "Give";
const TYPES: [ListingType, string, string][] = [
  ["Sell", "Bán", "Bán cây, chậu, vật tư"], ["Buy", "Cần mua", "Đăng nhu cầu, nhận báo giá"],
  ["Rent", "Cho thuê", "Cây Tết, sự kiện, văn phòng"], ["Give", "Tặng / Trao đổi", "Cho cây con, đổi cây"],
];
const PICKUPS: [string, string][] = [["PICKUP", "Đến xem / lấy tại chỗ"], ["SELLER_DELIVERY", "Tôi giao được"], ["SELF_ARRANGED_CARRIER", "Gửi xe / chành xe"]];
const VERIFY_THRESHOLD = 20_000_000;

export default function PostListingPage() {
  return <Suspense><PostListingForm /></Suspense>;
}

/** Đăng tin mới, hoặc sửa tin khi có ?id=… (loại tin không đổi được — BR, xem ListingService.UpdateAsync). */
function PostListingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const [notice, setNotice] = useState<string>();
  const [me, setMe] = useState<Me>();
  const [tree, setTree] = useState<CategoryTree[]>([]);
  const [type, setType] = useState<ListingType>("Sell");
  const [categoryId, setCategoryId] = useState("");
  const [category, setCategory] = useState<Category>();
  const [speciesQ, setSpeciesQ] = useState("");
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
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
  const [rent, setRent] = useState({ unit: "Month", pricePerUnit: "", deposit: "0", minUnits: "1" });
  const [wantInExchange, setWant] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("cây");
  const [attrs, setAttrs] = useState<Record<string, unknown>>({});
  const [uses, setUses] = useState<string[]>([]);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [verification, setVerification] = useState<UploadedPhoto[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>();
  const [pickup, setPickup] = useState<string[]>(["PICKUP"]);
  const [escrow, setEscrow] = useState(false);
  const [error, setError] = useState<string[]>();
  const [busy, setBusy] = useState(false);
  const [pendingAttrs, setPendingAttrs] = useState<Record<string, unknown>>();

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

  useEffect(() => {
    if (!categoryId || species) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api<Species[]>(`species?categoryId=${categoryId}&q=${encodeURIComponent(speciesQ)}&limit=8`).then((r) => { if (!cancelled) setSpeciesList(r); }, () => {});
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [speciesQ, categoryId, species]);

  // AI gợi ý loài từ ảnh đầu tiên (BR-AI-01: chỉ gợi ý, người dùng tự chọn; BR-AI-02: lựa chọn được lưu làm nhãn).
  const [ai, setAi] = useState<{ requestId: string; recognized: boolean; suggestions: { speciesId: string; commonName: string; confidence: number }[]; message?: string }>();
  const firstPhoto = photos[0]?.id;
  useEffect(() => {
    if (!firstPhoto || species || !category?.isLivePlant || editId) return;
    let cancelled = false;
    api<NonNullable<typeof ai>>("ai/identify", { method: "POST", json: { mediaId: firstPhoto } }).then((r) => { if (!cancelled) setAi(r); }, () => {});
    return () => { cancelled = true; };
  }, [firstPhoto, species, category?.isLivePlant, editId]);
  function pickSpecies(s: { id: string; name: string }) {
    setSpecies(s);
    if (ai && s.id !== "khac") api(`ai/identify/${ai.requestId}/label`, { method: "POST", json: { speciesId: s.id } }).catch(() => {});
  }

  const effectivePrice = type === "Sell" ? Number(priceMode === "Negotiable" ? refMax : price) || 0 : 0;
  const needsVerification = type === "Sell" && effectivePrice >= VERIFY_THRESHOLD;
  const minPhotos = type === "Buy" ? 0 : category?.isLivePlant ? 3 : 1;
  const needsSpecies = !!category?.isLivePlant && type !== "Buy";
  const visibleAttrs = useMemo(() => [...(category?.attributes ?? [])].sort((a, b) => (a.required === b.required ? 0 : a.required ? -1 : 1)), [category]);

  if (!me) return error ? <Alert>{error[0]}</Alert> : <p className="text-stone-500">Đang tải…</p>;
  if (!me.canPost) return <div className="mx-auto max-w-lg"><ProfileGate me={me} onDone={(m) => { setMe(m); setProvinceId(m.provinceId ?? ""); }} /></div>;

  function locate() {
    navigator.geolocation?.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setError(["Không lấy được vị trí"]));
  }

  const num = (s: string) => (s === "" ? null : Number(s));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const problems: string[] = [];
    if (!categoryId) problems.push("Chọn danh mục");
    if (needsSpecies && !species) problems.push("Chọn loài cây (hoặc \"Khác / không rõ\")");
    if (photos.length < minPhotos) problems.push(`Cần ít nhất ${minPhotos} ảnh`);
    if (needsVerification && verification.length === 0) problems.push("Tin từ 20 triệu cần 1 ảnh xác minh");
    if (problems.length) return setError(problems);

    setBusy(true);
    const listing = {
      type, categoryId, speciesId: species?.id ?? null, title, description,
      price: type === "Sell" && priceMode === "Fixed" ? num(price) : type === "Give" ? 0 : null,
      priceMode: type === "Sell" ? priceMode : "Fixed", priceNegotiable: negotiable,
      priceRefMin: priceMode === "Negotiable" ? num(refMin) : null, priceRefMax: priceMode === "Negotiable" ? num(refMax) : null,
      budgetMin: type === "Buy" ? num(budgetMin) : null, budgetMax: type === "Buy" ? num(budgetMax) : null,
      neededBy: type === "Buy" && neededBy ? new Date(neededBy).toISOString() : null,
      rent: type === "Rent" ? { unit: rent.unit, pricePerUnit: Number(rent.pricePerUnit), deposit: Number(rent.deposit), minUnits: Number(rent.minUnits) } : null,
      wantInExchange: type === "Give" ? wantInExchange : null,
      quantity: Number(quantity), unit, attributes: attrs, uses, provinceId, lat: coords?.lat ?? null, lng: coords?.lng ?? null,
      pickupOptions: pickup, escrowEnabled: escrow, mediaIds: photos.map((p) => p.id), verificationMediaId: verification[0]?.id ?? null,
    };
    try {
      if (editId) {
        const r = await api<{ id: string; status: string; pendingRevision?: unknown }>(`listings/${editId}`, { method: "PUT", json: { listing, submit: true } });
        if (r.pendingRevision) {
          setNotice("Đã lưu. Thay đổi về ảnh/tiêu đề/loài đang chờ duyệt — tin cũ vẫn hiển thị trong lúc chờ.");
          setBusy(false);
        } else router.push(r.status === "Active" ? `/tin/${r.id}` : "/tai-khoan");
        return;
      }
      const r = await api<{ id: string; status: string; rejectReason?: string }>("listings", { method: "POST", json: { listing, submit: true } });
      if (r.status === "Active") router.push(`/tin/${r.id}`);
      else router.push(`/tai-khoan?posted=${r.status}`);
    } catch (err) {
      const d = (err as ApiError).details;
      setError(Array.isArray(d) ? d.map((x) => (x as { message: string }).message) : [errorText(err)]);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">{editId ? "Sửa tin" : "Đăng tin"}</h1>

      <Section title="Loại tin">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPES.map(([v, l, d]) => (
            <button type="button" key={v} onClick={() => setType(v)} disabled={!!editId && v !== type}
              className={`rounded-lg border p-3 text-left text-sm ${type === v ? "border-emerald-600 bg-emerald-50" : "border-stone-200"}`}>
              <b>{l}</b><span className="block text-xs text-stone-500">{d}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Cây / hàng hóa">
        <div className="space-y-3">
          <Label text="Danh mục" required>
            <select required value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSpecies(undefined); setSpeciesQ(""); }} className={field}>
              <option value="">— Chọn danh mục —</option>
              {tree.map((c) => <optgroup key={c.id} label={c.name}>{c.children.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>)}
            </select>
          </Label>
          {category?.requiresManualReview && <Alert kind="warn">Danh mục hàng hạn chế: tin sẽ được người duyệt kiểm tra giấy tờ trước khi hiển thị.</Alert>}

          {categoryId && category?.isLivePlant && (
            <Label text="Loài cây" required={needsSpecies} hint="Chọn đúng loài giúp người mua tìm thấy tin của bạn, kể cả khi họ gõ tên khác">
              {species ? (
                <div className="flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">{species.name}</span>
                  <button type="button" onClick={() => setSpecies(undefined)} className="text-xs text-stone-500 underline">đổi</button></div>
              ) : (
                <div>
                  {ai && (ai.recognized ? (
                    <div className="mb-2 flex flex-wrap items-center gap-1 text-sm">
                      <span className="text-stone-600">AI gợi ý từ ảnh đầu tiên:</span>
                      {ai.suggestions.map((s) => (
                        <button type="button" key={s.speciesId} onClick={() => pickSpecies({ id: s.speciesId, name: s.commonName })}
                          className="rounded-full border border-emerald-600 bg-emerald-50 px-3 py-1 text-emerald-800 hover:bg-emerald-100">
                          {s.commonName} · {Math.round(s.confidence * 100)}%
                        </button>
                      ))}
                    </div>
                  ) : <p className="mb-2 text-sm text-stone-500">{ai.message ?? "Chưa nhận ra, bạn chọn giúp nhé."}</p>)}
                  <input value={speciesQ} onChange={(e) => setSpeciesQ(e.target.value)} placeholder="Gõ tên cây, vd: kim tiền, lưỡi hổ…" className={field} />
                  <div className="mt-1 flex flex-wrap gap-1">
                    {speciesList.map((s) => (
                      <button type="button" key={s.id} onClick={() => pickSpecies({ id: s.id, name: s.commonName })} className="rounded-full bg-stone-100 px-3 py-1 text-xs hover:bg-emerald-50">
                        {s.commonName}{s.aliases.length > 0 && <span className="text-stone-400"> ({s.aliases[0]})</span>}
                      </button>
                    ))}
                    <button type="button" onClick={() => setSpecies({ id: "khac", name: "Khác / không rõ" })} className="rounded-full bg-stone-100 px-3 py-1 text-xs">Khác / không rõ</button>
                  </div>
                </div>
              )}
            </Label>
          )}

          <Label text="Tiêu đề" required hint="10–70 ký tự, không ghi số điện thoại">
            <input required minLength={10} maxLength={70} value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="vd: Sen đá kim tuyến chậu 10cm, lên màu đẹp" />
          </Label>
          <Label text="Mô tả" required hint="Tình trạng cây, kích thước, cách chăm… Không ghi SĐT hay link — người mua liên hệ qua nút Nhắn tin / Hiện số">
            <textarea required minLength={20} maxLength={3000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
          </Label>

          {visibleAttrs.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleAttrs.map((a) => <AttributeInput key={a.key} def={a} value={attrs[a.key]} required={a.required && type !== "Buy"} onChange={(v) => setAttrs({ ...attrs, [a.key]: v })} />)}
            </div>
          )}

          {/* Không dùng <Label>: <label> bọc nhiều nút sẽ kích hoạt nút đầu tiên khi bấm vào chữ. */}
          <div role="group" aria-labelledby="uses-label" className="text-[15px]">
            <span id="uses-label" className="mb-1.5 block font-bold text-stone-800">Công dụng (tối đa {MAX_USES_PER_LISTING})</span>
            <div className="flex flex-wrap gap-2">
              {PLANT_USES.map((u) => {
                const on = uses.includes(u);
                return (
                  <button key={u} type="button" aria-pressed={on} disabled={!on && uses.length >= MAX_USES_PER_LISTING}
                    onClick={() => setUses(on ? uses.filter((x) => x !== u) : [...uses, u])}
                    className={`rounded-full border px-3 py-1 text-sm disabled:opacity-40 ${on ? "border-emerald-800 bg-emerald-800 text-stone-50" : "border-stone-300 bg-white hover:border-emerald-700"}`}>
                    {u}
                  </button>
                );
              })}
            </div>
            <span className="mt-1 block text-sm text-stone-500">Giúp người mua tìm thấy tin khi lọc trên Chợ cây</span>
          </div>
        </div>
      </Section>

      <Section title={type === "Buy" ? "Nhu cầu" : "Giá & số lượng"}>
        <div className="grid gap-3 sm:grid-cols-2">
          {type === "Sell" && (
            <>
              {category?.allowNegotiablePrice && (
                <Label text="Cách báo giá">
                  <select value={priceMode} onChange={(e) => setPriceMode(e.target.value as "Fixed" | "Negotiable")} className={field}>
                    <option value="Fixed">Giá cố định</option><option value="Negotiable">Giá thỏa thuận</option>
                  </select>
                </Label>
              )}
              {priceMode === "Fixed" ? (
                <Label text="Giá (đồng)" required>
                  <input required type="number" min={1000} step={1000} value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
                  <label className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} />Có thương lượng</label>
                </Label>
              ) : (
                <Label text="Khoảng giá tham khảo (ẩn)" required hint="Không hiển thị công khai, dùng cho bộ lọc giá">
                  <div className="flex gap-2">
                    <input required type="number" min={1000} placeholder="từ" value={refMin} onChange={(e) => setRefMin(e.target.value)} className={field} />
                    <input required type="number" min={1000} placeholder="đến" value={refMax} onChange={(e) => setRefMax(e.target.value)} className={field} />
                  </div>
                </Label>
              )}
            </>
          )}
          {type === "Buy" && (
            <>
              <Label text="Ngân sách (đồng)">
                <div className="flex gap-2">
                  <input type="number" min={0} placeholder="từ" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className={field} />
                  <input type="number" min={0} placeholder="đến" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className={field} />
                </div>
              </Label>
              <Label text="Cần hàng trước ngày" hint="Tối đa 30 ngày"><input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className={field} /></Label>
            </>
          )}
          {type === "Rent" && (
            <>
              <Label text="Giá thuê" required>
                <div className="flex gap-2">
                  <input required type="number" min={1000} value={rent.pricePerUnit} onChange={(e) => setRent({ ...rent, pricePerUnit: e.target.value })} className={field} />
                  <select value={rent.unit} onChange={(e) => setRent({ ...rent, unit: e.target.value })} className={field}>
                    <option value="Day">/ngày</option><option value="Week">/tuần</option><option value="Month">/tháng</option><option value="TetSeason">/mùa Tết</option>
                  </select>
                </div>
              </Label>
              <Label text="Tiền cọc (đồng)"><input type="number" min={0} value={rent.deposit} onChange={(e) => setRent({ ...rent, deposit: e.target.value })} className={field} /></Label>
            </>
          )}
          {type === "Give" && (
            <Label text="Muốn đổi lấy (nếu có)"><input value={wantInExchange} onChange={(e) => setWant(e.target.value)} className={field} placeholder="vd: đổi lấy sen đá khác" /></Label>
          )}
          <Label text="Số lượng">
            <div className="flex gap-2">
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={field} />
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={field}>
                {["cây", "chậu", "bầu", "cành", "gói hạt", "kg", "bao", "bộ"].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </Label>
        </div>
      </Section>

      {type !== "Buy" && (
        <Section title={`Ảnh (${photos.length}/12)`}>
          <p className="mb-2 text-xs text-stone-500">Tối thiểu {minPhotos} ảnh. Ảnh chụp trực tiếp bằng nút “Chụp ảnh” sẽ được gắn nhãn “Ảnh chụp thực tế”, giúp tin đáng tin hơn.</p>
          <PhotoPicker value={photos} onChange={setPhotos} />
          {needsVerification && (
            <div className="mt-4 rounded-lg bg-wood-100 p-3">
              <p className="mb-2 text-sm text-wood-800"><b>Ảnh xác minh</b> (bắt buộc cho tin từ 20 triệu): chụp cây kèm tờ giấy ghi <b>tên tài khoản “{me.displayName}”</b> và <b>ngày hôm nay</b>.</p>
              <PhotoPicker value={verification} onChange={setVerification} max={1} label="Chọn ảnh" />
            </div>
          )}
        </Section>
      )}

      <Section title="Khu vực & giao nhận">
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Tỉnh / thành" required>
            <select required value={provinceId} onChange={(e) => setProvinceId(e.target.value)} className={field}>
              <option value="">— Chọn —</option>{PROVINCES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Label>
          <Label text="Vị trí trên bản đồ" hint={me.flags.hasActivePlan ? "Hiển thị chính xác cho Nhà vườn/Shop" : "Người bán cá nhân: vị trí được làm tròn ~1 km để bảo vệ địa chỉ nhà"}>
            <button type="button" onClick={locate} className={`${btn.secondary} w-full`}>{coords ? `Vị trí: ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : "Dùng vị trí hiện tại"}</button>
          </Label>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {PICKUPS.map(([v, l]) => (
            <label key={v} className="flex items-center gap-2">
              <input type="checkbox" checked={pickup.includes(v)} onChange={(e) => setPickup(e.target.checked ? [...pickup, v] : pickup.filter((x) => x !== v))} />{l}
            </label>
          ))}
        </div>
        {type === "Sell" && me.flags.hasVerifiedGarden && (
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={escrow} onChange={(e) => setEscrow(e.target.checked)} />
            Nhận Giao dịch đảm bảo (tiền được giữ hộ đến khi người mua nhận cây)</label>
        )}
      </Section>

      {error && <Alert><ul className="list-disc pl-4">{error.map((e) => <li key={e}>{e}</li>)}</ul></Alert>}
      {notice && <Alert kind="ok">{notice}</Alert>}
      <button disabled={busy} className={`${btn.primary} w-full py-3 text-base`}>{busy ? "Đang lưu…" : editId ? "Lưu thay đổi" : "Đăng tin"}</button>
      <p className="text-center text-xs text-stone-500">Tin được kiểm tra tự động; một số tin cần người duyệt (thường dưới 2 giờ trong khung 7h–22h).</p>
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
        <option value="">— Chọn —</option>{def.options.map((o) => <option key={o}>{o}</option>)}</select></Label>;
    case "MultiSelect": {
      const arr = (value as string[]) ?? [];
      return <Label text={label} required={required}><div className="flex flex-wrap gap-2">{def.options.map((o) => (
        <label key={o} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={arr.includes(o)} onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />{o}</label>
      ))}</div></Label>;
    }
    case "Boolean":
      return <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />{def.label}</label>;
    default:
      return <Label text={label} required={required}><input required={required} maxLength={200} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className={field} /></Label>;
  }
}
