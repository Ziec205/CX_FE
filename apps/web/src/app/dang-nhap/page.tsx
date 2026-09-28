"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Alert, btn, field } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const raw = useSearchParams().get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"; // chặn chuyển hướng ra trang ngoài
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Có lỗi xảy ra");
    return data;
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    try {
      const r = await post("/api/auth/otp/request", { phone, deviceId: getDeviceId() });
      setDevCode(r.devCode ?? null);
      setStep("code");
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    try {
      const r = await post("/api/auth/otp/verify", { phone, code });
      router.replace(r.user.canPost ? next : `/tai-khoan?next=${encodeURIComponent(next)}`);
      router.refresh();
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-stone-200 bg-white p-6">
      <h1 className="mb-1 text-xl font-semibold">Đăng nhập / Đăng ký</h1>
      <p className="mb-4 text-sm text-stone-500">Chỉ cần số điện thoại. Người bán cá nhân không cần CCCD.</p>
      {step === "phone" ? (
        <form onSubmit={requestCode} className="space-y-3">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" required placeholder="Số điện thoại, vd 0912 345 678" className={field} />
          {error && <Alert>{error}</Alert>}
          <button disabled={busy} className={`${btn.primary} w-full`}>{busy ? "Đang gửi…" : "Nhận mã OTP"}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-sm">Mã OTP đã gửi tới <b>{phone}</b>. <button type="button" onClick={() => setStep("phone")} className="text-emerald-700 underline">Đổi số</button></p>
          {devCode && <Alert kind="info">Môi trường phát triển — mã OTP: <b className="tracking-widest">{devCode}</b></Alert>}
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required placeholder="Mã 6 số" className={`${field} text-center text-lg tracking-[0.5em]`} />
          {error && <Alert>{error}</Alert>}
          <button disabled={busy || code.length !== 6} className={`${btn.primary} w-full`}>{busy ? "Đang xác thực…" : "Xác nhận"}</button>
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
