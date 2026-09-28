"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Alert, btn, field } from "@/components/ui";
import { isPhoneLike, safeNext } from "@/lib/login";

/** Một trang đăng nhập chung: số điện thoại → OTP (thành viên); tên đăng nhập → mật khẩu (quản trị, chuyển vào /quan-tri). */
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"account" | "code" | "password">(params.get("admin") ? "password" : "account");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Có lỗi xảy ra");
    return data;
  }

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!isPhoneLike(account)) { setStep("password"); return; }
    setBusy(true);
    try {
      const r = await post("/api/auth/otp/request", { phone: account, deviceId: getDeviceId() });
      setDevCode(r.devCode ?? null);
      setStep("code");
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    try {
      const r = await post("/api/auth/otp/verify", { phone: account, code });
      const target = next.startsWith("/quan-tri") ? "/" : next;
      router.replace(r.user.canPost ? target : `/tai-khoan?next=${encodeURIComponent(target)}`);
      router.refresh();
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  async function adminLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    try {
      await post("/api/admin-auth/login", { username: account.trim(), password, totpCode: totp || null });
      router.replace(next.startsWith("/quan-tri") ? next : "/quan-tri");
      router.refresh();
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  const back = () => { setStep("account"); setError(undefined); setPassword(""); setTotp(""); };

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-stone-200 bg-white p-6">
      <h1 className="mb-1 text-xl font-semibold">{step === "password" ? "Đăng nhập quản trị" : "Đăng nhập / Đăng ký"}</h1>
      <p className="mb-4 text-sm text-stone-500">
        {step === "password" ? "Dành cho đội vận hành Chạm Xanh." : "Nhập số điện thoại để nhận mã OTP. Người bán cá nhân không cần CCCD."}
      </p>

      {step === "account" && (
        <form onSubmit={submitAccount} className="space-y-3">
          <label htmlFor="account" className="sr-only">Số điện thoại hoặc tên đăng nhập</label>
          <input id="account" value={account} onChange={(e) => setAccount(e.target.value)} autoComplete="username" required autoFocus
            placeholder="Số điện thoại (hoặc tên đăng nhập quản trị)" className={field} />
          {error && <Alert>{error}</Alert>}
          <button disabled={busy} className={`${btn.primary} w-full`}>{busy ? "Đang gửi…" : "Tiếp tục"}</button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-sm">Mã OTP đã gửi tới <b>{account}</b>. <button type="button" onClick={back} className="text-emerald-700 underline">Đổi số</button></p>
          {devCode && <Alert kind="info">Môi trường phát triển — mã OTP: <b className="tracking-widest">{devCode}</b></Alert>}
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required placeholder="Mã 6 số" className={`${field} text-center text-lg tracking-[0.5em]`} />
          {error && <Alert>{error}</Alert>}
          <button disabled={busy || code.length !== 6} className={`${btn.primary} w-full`}>{busy ? "Đang xác thực…" : "Xác nhận"}</button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={adminLogin} className="space-y-3">
          <input value={account} onChange={(e) => setAccount(e.target.value)} autoComplete="username" required placeholder="Tên đăng nhập" className={field} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required placeholder="Mật khẩu" className={field} />
          <input value={totp} onChange={(e) => setTotp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Mã 2FA (nếu đã bật)" className={field} />
          {error && <Alert>{error}</Alert>}
          <button disabled={busy} className={`${btn.primary} w-full`}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
          <button type="button" onClick={back} className="w-full text-sm text-emerald-700 underline">Đăng nhập bằng số điện thoại</button>
        </form>
      )}
    </div>
  );
}

function getDeviceId() {
  try {
    let id = localStorage.getItem("cx.device");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("cx.device", id); }
    return id;
  } catch { return undefined; }
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
