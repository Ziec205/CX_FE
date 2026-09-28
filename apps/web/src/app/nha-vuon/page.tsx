"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhotoPicker, type UploadedPhoto } from "@/components/PhotoPicker";
import { Alert, btn, field, Label, Section } from "@/components/ui";
import { api, errorText, newIdempotencyKey, type ApiError } from "@/lib/api";
import { PROVINCES } from "@/lib/provinces";
import type { PublicPricing } from "@/lib/types";

interface GardenOwner {
  profile: { id: string; slug: string; name: string; tick: boolean; founding: boolean };
  status: "Submitted" | "NeedsInfo" | "Verified" | "Rejected" | "Revoked"; reviewNote?: string;
  plan?: { months: number; endAt: string; autoRenew: boolean } | null; inGrace: boolean;
  bank?: { bankCode: string; accountNoMasked: string; accountName: string } | null;
}

const STATUS: Record<string, string> = {
  Submitted: "Đang chờ duyệt hồ sơ", NeedsInfo: "Cần bổ sung hồ sơ", Verified: "Đã xác minh", Rejected: "Hồ sơ bị từ chối", Revoked: "Đã bị thu hồi",
};

export default function GardenPage() {
  const [garden, setGarden] = useState<GardenOwner | null>();
  const [pricing, setPricing] = useState<PublicPricing>();
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string }>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<GardenOwner>("garden").then((g) => { if (!cancelled) setGarden(g); }, (e: ApiError) => { if (!cancelled) setGarden(e.status === 404 ? null : undefined); });
    api<PublicPricing>("pricing/current").then((p) => { if (!cancelled) setPricing(p); }, () => {});
    return () => { cancelled = true; };
  }, [reload]);

  async function buy(months: number, priceVnd: number) {
    if (!pricing) return;
    const priceXu = Math.ceil(priceVnd / 1000);
    if (!confirm(`Mua gói ${months} tháng với ${priceXu} Xu?`)) return;
    try {
      await api("garden/plan", { method: "POST", json: { months, expectedPriceBookVersion: pricing.version, expectedPriceXu: priceXu, idempotencyKey: newIdempotencyKey(), autoRenew: true } });
      setMsg({ kind: "ok", text: "Đã kích hoạt gói Nhà vườn" });
      setReload((x) => x + 1);
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  if (garden === undefined && !msg) return <p className="text-stone-500">Đang tải…</p>;
  const canApply = garden === null || garden?.status === "NeedsInfo" || garden?.status === "Rejected";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Nhà vườn / Shop</h1>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      {garden && (
        <Section title={garden.profile.name}>
          <p className="text-sm">Trạng thái: <b>{STATUS[garden.status]}</b>{garden.reviewNote && <span className="text-wood-800"> — {garden.reviewNote}</span>}</p>
          {garden.bank && <p className="text-sm text-stone-600">Tài khoản nhận tiền: {garden.bank.bankCode} {garden.bank.accountNoMasked} ({garden.bank.accountName})</p>}
          {garden.status === "Verified" && (
            <>
              <p className="mt-2 text-sm">
                {garden.profile.tick ? <>Gói còn hạn đến <b>{new Date(garden.plan!.endAt).toLocaleDateString("vi-VN")}</b> · <Link className="text-emerald-700 underline" href={`/vuon/${garden.profile.slug}`}>Xem gian hàng</Link></>
                  : garden.inGrace ? "Gói đã hết hạn — đang trong thời gian ân hạn (mất tick và pin bản đồ)." : "Chưa có gói: bạn vẫn dùng được Giao dịch đảm bảo, nhưng chưa có gian hàng, tick xanh và pin trên bản đồ."}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {pricing?.gardenPlans.filter((p) => p.enabled).map((p) => (
                  <button key={p.months} onClick={() => buy(p.months, p.priceVnd)} className="rounded-xl border border-stone-200 p-3 text-left hover:border-emerald-500">
                    <p className="font-semibold">{p.months} tháng</p>
                    <p className="text-sm">{p.priceVnd.toLocaleString("vi-VN")}đ ({Math.ceil(p.priceVnd / 1000)} Xu)</p>
                    <p className="text-xs text-stone-500">~{Math.round(p.priceVnd / p.months / 1000)}k/tháng</p>
                  </button>
                ))}
              </div>
              {garden.profile.founding && <p className="mt-2 text-xs text-emerald-700">Nhà vườn Sáng lập: được giảm giá khi gia hạn (áp tự động).</p>}
            </>
          )}
        </Section>
      )}

      {canApply && <ApplicationForm onSubmitted={() => { setMsg({ kind: "info", text: "Đã gửi hồ sơ, đội ngũ sẽ duyệt và thông báo cho bạn." }); setReload((x) => x + 1); }} />}
    </div>
  );
}

function ApplicationForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [f, setF] = useState({
    name: "", type: "Garden", description: "", address: "", provinceId: "", openingHours: "7h–17h", allowVisit: true,
    method: "VideoCall", businessLicenseNo: "", idNumber: "", fullName: "", dateOfBirth: "", bankCode: "", bankAccountNo: "", bankAccountName: "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number }>();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [docs, setDocs] = useState<UploadedPhoto[]>([]);
  const [errors, setErrors] = useState<string[]>();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords) return setErrors(["Hãy ghim vị trí vườn/shop (đứng tại vườn và bấm “Dùng vị trí hiện tại”)"]);
    try {
      await api("garden/application", { method: "POST", json: {
        ...f, businessLicenseNo: f.businessLicenseNo || null, lat: coords.lat, lng: coords.lng,
        photoMediaIds: photos.map((p) => p.id), documentMediaIds: docs.map((d) => d.id),
      } });
      onSubmitted();
    } catch (err) {
      const d = (err as ApiError).details;
      setErrors(Array.isArray(d) ? d.map(String) : [errorText(err)]);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section title="Đăng ký Nhà vườn / Shop">
        <p className="mb-3 text-sm text-stone-600">Xác minh CCCD chủ vườn/shop để: bật <b>Giao dịch đảm bảo</b>, mua <b>gói Nhà vườn</b> (gian hàng riêng, tick xanh, pin trên bản đồ). CCCD được mã hóa và chỉ nhân viên xác minh được xem.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Tên vườn / shop" required><input required value={f.name} onChange={set("name")} className={field} /></Label>
          <Label text="Loại"><select value={f.type} onChange={set("type")} className={field}><option value="Garden">Nhà vườn</option><option value="Shop">Shop</option></select></Label>
          <Label text="Địa chỉ" required><input required value={f.address} onChange={set("address")} className={field} /></Label>
          <Label text="Tỉnh / thành" required>
            <select required value={f.provinceId} onChange={set("provinceId")} className={field}><option value="">— Chọn —</option>{PROVINCES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </Label>
          <Label text="Giờ mở cửa"><input value={f.openingHours} onChange={set("openingHours")} className={field} /></Label>
          <Label text="Vị trí vườn" required>
            <button type="button" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }))} className={`${btn.secondary} w-full`}>
              {coords ? `Vị trí: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Dùng vị trí hiện tại"}
            </button>
          </Label>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allowVisit} onChange={set("allowVisit")} />Cho khách đến tham quan vườn</label>
        <div className="mt-3"><Label text="Giới thiệu"><textarea rows={3} value={f.description} onChange={set("description")} className={field} /></Label></div>
        <p className="mb-1 mt-3 text-sm font-medium">Ảnh vườn/shop thật (2–20 ảnh)</p>
        <PhotoPicker value={photos} onChange={setPhotos} max={20} />
      </Section>

      <Section title="Xác minh chủ vườn/shop">
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Số CCCD" required><input required inputMode="numeric" pattern="\d{12}" maxLength={12} value={f.idNumber} onChange={set("idNumber")} className={field} /></Label>
          <Label text="Họ tên trên CCCD" required><input required value={f.fullName} onChange={set("fullName")} className={field} /></Label>
          <Label text="Ngày sinh" required><input required type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} className={field} /></Label>
          <Label text="Hình thức xác minh">
            <select value={f.method} onChange={set("method")} className={field}>
              <option value="VideoCall">Gọi video với nhân viên</option><option value="FieldVisit">Nhân viên đến tận vườn</option><option value="BusinessLicense">Có GPKD / MST</option>
            </select>
          </Label>
          {f.method === "BusinessLicense" && <Label text="Số GPKD / MST" required><input required value={f.businessLicenseNo} onChange={set("businessLicenseNo")} className={field} /></Label>}
        </div>
        <p className="mb-1 mt-3 text-sm font-medium">Ảnh 2 mặt CCCD</p>
        <PhotoPicker value={docs} onChange={setDocs} max={4} kind="KycDocument" label="Chọn ảnh" />
      </Section>

      <Section title="Tài khoản nhận tiền">
        <p className="mb-2 text-xs text-stone-500">Tên chủ tài khoản phải trùng họ tên trên CCCD.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Label text="Ngân hàng" required><input required placeholder="VCB, TCB, MB…" value={f.bankCode} onChange={set("bankCode")} className={field} /></Label>
          <Label text="Số tài khoản" required><input required inputMode="numeric" value={f.bankAccountNo} onChange={set("bankAccountNo")} className={field} /></Label>
          <Label text="Tên chủ tài khoản" required><input required value={f.bankAccountName} onChange={set("bankAccountName")} className={field} /></Label>
        </div>
      </Section>

      {errors && <Alert><ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul></Alert>}
      <button className={`${btn.primary} w-full py-3`}>Gửi hồ sơ</button>
    </form>
  );
}
