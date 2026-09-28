"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Card, PageTitle, Pill, btn, input } from "@/components/ui";
import { api, errorText, formatDate } from "@/lib/api";

interface Campaign {
  id: string; name: string; description?: string | null; startAt: string; endAt: string; bannerMediaId?: string | null; bannerLink?: string | null;
  categoryIds: string[]; speciesIds: string[]; collectionIds: string[]; homeOrder: number; enabled: boolean;
}

const empty = (): Campaign => ({
  id: "", name: "", description: "", startAt: new Date().toISOString(), endAt: new Date(Date.now() + 30 * 864e5).toISOString(),
  bannerMediaId: null, bannerLink: "", categoryIds: [], speciesIds: [], collectionIds: [], homeOrder: 0, enabled: false,
});
const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const dateOnly = (iso: string) => iso.slice(0, 10);

export default function CampaignsPage() {
  const [rows, setRows] = useState<Campaign[]>();
  const [edit, setEdit] = useState<Campaign>();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  const load = useCallback(() => { api<Campaign[]>("admin/campaigns").then(setRows, (e) => setMsg({ kind: "err", text: errorText(e) })); }, []);
  useEffect(load, [load]);

  async function upload(file?: File) {
    if (!file || !edit) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/proxy/admin/media", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) { setMsg({ kind: "err", text: data?.message ?? "Tải ảnh thất bại" }); return; }
    setEdit({ ...edit, bannerMediaId: data.id });
  }

  async function save() {
    if (!edit) return;
    try {
      await api(`admin/campaigns/${encodeURIComponent(edit.id || edit.name)}`, { method: "PUT", json: edit });
      setMsg({ kind: "ok", text: "Đã lưu chuyên trang" }); setEdit(undefined); load();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }
  async function remove(id: string) {
    if (!confirm("Xóa chuyên trang?")) return;
    try { await api(`admin/campaigns/${id}`, { method: "DELETE" }); load(); } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  const [now] = useState(() => Date.now());
  return (
    <div className="max-w-5xl space-y-4">
      <PageTitle title="Chuyên trang mùa vụ" subtitle="Chợ hoa Tết, 8/3, mùa mưa… hiện banner trên trang chủ trong thời gian bật" action={<button onClick={() => setEdit(empty())} className={btn.primary}>+ Tạo mới</button>} />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {edit && (
        <Card title={edit.id ? `Sửa: ${edit.name}` : "Chuyên trang mới"}>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <label>Tên<input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={`${input} mt-1 w-full`} /></label>
            <label>Thứ tự trên trang chủ<input type="number" value={edit.homeOrder} onChange={(e) => setEdit({ ...edit, homeOrder: Number(e.target.value) })} className={`${input} mt-1 w-full`} /></label>
            <label>Bắt đầu<input type="date" value={dateOnly(edit.startAt)} onChange={(e) => setEdit({ ...edit, startAt: new Date(e.target.value).toISOString() })} className={`${input} mt-1 w-full`} /></label>
            <label>Kết thúc<input type="date" value={dateOnly(edit.endAt)} onChange={(e) => setEdit({ ...edit, endAt: new Date(e.target.value).toISOString() })} className={`${input} mt-1 w-full`} /></label>
            <label className="sm:col-span-2">Mô tả<input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className={`${input} mt-1 w-full`} /></label>
            <label>Danh mục (mã, phẩy)<input defaultValue={edit.categoryIds.join(", ")} onBlur={(e) => setEdit({ ...edit, categoryIds: split(e.target.value) })} className={`${input} mt-1 w-full`} /></label>
            <label>Loài (mã, phẩy)<input defaultValue={edit.speciesIds.join(", ")} onBlur={(e) => setEdit({ ...edit, speciesIds: split(e.target.value) })} className={`${input} mt-1 w-full`} /></label>
            <label>Bộ sưu tập (mã, phẩy)<input defaultValue={edit.collectionIds.join(", ")} onBlur={(e) => setEdit({ ...edit, collectionIds: split(e.target.value) })} className={`${input} mt-1 w-full`} /></label>
            <label>Link banner<input value={edit.bannerLink ?? ""} onChange={(e) => setEdit({ ...edit, bannerLink: e.target.value })} className={`${input} mt-1 w-full`} placeholder="/tim-kiem?collectionId=cay-tet" /></label>
            <div className="sm:col-span-2">
              Banner
              <div className="mt-1 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {edit.bannerMediaId && <img src={`/media/${edit.bannerMediaId}/card.webp`} alt="" className="h-20 rounded" />}
                <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} />
              </div>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={edit.enabled} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} />Bật</label>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={save} className={btn.primary}>Lưu</button><button onClick={() => setEdit(undefined)} className={btn.secondary}>Hủy</button></div>
        </Card>
      )}
      <table className="w-full rounded-lg border border-stone-200 bg-white text-sm">
        <thead className="bg-stone-50 text-left text-stone-500"><tr><th className="p-2">Tên</th><th>Thời gian</th><th>Trạng thái</th><th /></tr></thead>
        <tbody>
          {rows?.map((c) => {
            const live = c.enabled && new Date(c.startAt).getTime() <= now && new Date(c.endAt).getTime() > now;
            return (
              <tr key={c.id} className="border-t border-stone-100">
                <td className="p-2 font-medium">{c.name}</td>
                <td>{formatDate(c.startAt)} → {formatDate(c.endAt)}</td>
                <td><Pill value={live ? "Active" : "Normal"} label={live ? "Đang chạy" : c.enabled ? "Đã lên lịch" : "Tắt"} /></td>
                <td className="p-2 text-right">
                  <button onClick={() => setEdit(c)} className="text-emerald-700 hover:underline">Sửa</button>
                  <button onClick={() => remove(c.id)} className="ml-3 text-red-700 hover:underline">Xóa</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
