"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/admin/components/AdminContext";
import { Alert, Card, PageTitle, btn, input } from "@/admin/components/ui";
import { api, errorText } from "@/admin/lib/api";

export default function SecurityPage() {
  const { me } = useAdmin();
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string }>();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  async function begin() {
    try { setSetup(await api("admin/auth/2fa/setup", { method: "POST" })); }
    catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  async function enable() {
    try {
      await api("admin/auth/2fa/enable", { method: "POST", json: { code } });
      await fetch("/api/admin-auth/logout", { method: "POST" });
      router.replace("/dang-nhap?admin=1");
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  return (
    <div className="max-w-xl">
      <PageTitle title="Bảo mật tài khoản" subtitle="Tài khoản quản trị bắt buộc bật 2FA (BR-ADM-03)" />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <Card title="Xác thực 2 lớp (TOTP)">
        {me?.totpEnabled ? (
          <p className="text-sm text-emerald-700">✔ Đã bật 2FA.</p>
        ) : !setup ? (
          <>
            <p className="mb-3 text-sm text-stone-600">Khi chưa bật 2FA, tài khoản không có quyền thao tác nào trên môi trường production.</p>
            <button onClick={begin} className={btn.primary}>Bắt đầu thiết lập</button>
          </>
        ) : (
          <div className="space-y-3 text-sm">
            <p>1. Mở Google Authenticator / Microsoft Authenticator, chọn <b>Nhập khóa thiết lập</b> và nhập khóa:</p>
            <p className="select-all rounded bg-stone-100 p-2 font-mono tracking-wider">{setup.secret}</p>
            <p className="break-all text-xs text-stone-400">{setup.otpauthUri}</p>
            <p>2. Nhập mã 6 số ứng dụng hiển thị:</p>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} inputMode="numeric" className={`${input} w-32 tracking-widest`} />
              <button onClick={enable} disabled={code.length !== 6} className={btn.primary}>Bật 2FA</button>
            </div>
            <p className="text-xs text-stone-500">Sau khi bật, bạn sẽ được đăng xuất và cần đăng nhập lại kèm mã 2FA.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
