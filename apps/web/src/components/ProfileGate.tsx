"use client";

import { useState } from "react";
import { api, errorText } from "@/lib/api";
import { PROVINCES } from "@/lib/provinces";
import type { Me } from "@/lib/types";
import { Alert, btn, field, Label } from "./ui";

/** T0: trước khi đăng tin đầu tiên phải tự khai họ tên + tỉnh/thành (tài liệu 02 §3). */
export function ProfileGate({ me, onDone }: { me: Me; onDone: (me: Me) => void }) {
  const [fullName, setFullName] = useState(me.fullName ?? "");
  const [provinceId, setProvinceId] = useState(me.provinceId ?? "");
  const [displayName, setDisplayName] = useState(me.displayName);
  const [error, setError] = useState<string>();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try { onDone(await api<Me>("me", { method: "PUT", json: { fullName, provinceId, displayName } })); }
    catch (err) { setError(errorText(err)); }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-xl border border-stone-300 bg-stone-100 p-5">
      <h2 className="font-semibold">Hoàn tất thông tin người bán</h2>
      <p className="text-sm text-stone-600">Chỉ cần họ tên và tỉnh/thành — không cần CCCD. Họ tên không hiển thị công khai.</p>
      <Label text="Họ và tên" required><input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} /></Label>
      <Label text="Tên hiển thị" hint="Người mua sẽ thấy tên này"><input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={field} /></Label>
      <Label text="Tỉnh / thành phố" required>
        <select required value={provinceId} onChange={(e) => setProvinceId(e.target.value)} className={field}>
          <option value="">— Chọn —</option>{PROVINCES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Label>
      {error && <Alert>{error}</Alert>}
      <button className={btn.primary}>Lưu và tiếp tục</button>
    </form>
  );
}
