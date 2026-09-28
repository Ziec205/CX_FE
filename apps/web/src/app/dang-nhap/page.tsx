"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Alert, btn, field } from "@/components/ui";
import { safeNext } from "@/lib/login";

type Mode = "login" | "register" | "phone" | "code" | "admin";

/**
 * Trang đăng nhập chung:
 * - Thành viên: tên đăng nhập + mật khẩu (đăng ký chỉ cần nhập mật khẩu 2 lần, không cần SĐT/CCCD).
 * - Nhà vườn/Shop: đăng nhập bằng SĐT → OTP.
 * - Quản trị: tên đăng nhập + mật khẩu + 2FA, chuyển vào /quan-tri.
 */
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<Mode>(params.get("admin") ? "admin" : params.get("dang-ky") ? "register" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [totp, setTotp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Có lỗi xảy ra");
    return data;
  }

  /** Chạy thao tác gửi form: khóa nút, hiện lỗi. */
  const run = (fn: () => Promise<void>) => async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(undefined);
    try { await fn(); } catch (err) { setError((err as Error).message); setBusy(false); }
  };

  const memberDone = (user: { canPost: boolean }) => {
    const target = next.startsWith("/quan-tri") ? "/" : next;
    router.replace(user.canPost ? target : `/tai-khoan?next=${encodeURIComponent(target)}`);
    router.refresh();
  };

  const login = run(async () => memberDone((await post("/api/auth/login", { username, password })).user));

  const register = run(async () => {
    if (password !== confirm) throw new Error("Hai lần nhập mật khẩu không khớp");
    memberDone((await post("/api/auth/register", { username, password, confirmPassword: confirm })).user);
  });

  const requestOtp = run(async () => {
    const r = await post("/api/auth/otp/request", { phone, deviceId: getDeviceId() });
    setDevCode(r.devCode ?? null);
    setMode("code");
    setBusy(false);
  });

  const verifyOtp = run(async () => memberDone((await post("/api/auth/otp/verify", { phone, code })).user));

  const adminLogin = run(async () => {
    await post("/api/admin-auth/login", { username: username.trim(), password, totpCode: totp || null });
    router.replace(next.startsWith("/quan-tri") ? next : "/quan-tri");
    router.refresh();
  });

  const go = (m: Mode) => { setMode(m); setError(undefined); setPassword(""); setConfirm(""); setTotp(""); setCode(""); };

  const tab = (m: Mode, label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => go(m)}
      className={`flex-1 rounded-full py-2 text-[15px] font-bold transition ${mode === m ? "bg-white text-emerald-800 shadow-sm" : "text-stone-500 hover:text-emerald-800"}`}>
      {label}
    </button>
  );

  const title = { login: "Đăng nhập", register: "Tạo tài khoản", phone: "Đăng nhập bằng số điện thoại", code: "Nhập mã OTP", admin: "Đăng nhập quản trị" }[mode];

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-stone-200 bg-white p-6">
      {(mode === "login" || mode === "register") ? (
        <div role="tablist" aria-label="Đăng nhập hoặc tạo tài khoản" className="mb-5 flex gap-1 rounded-full bg-stone-100 p-1">
          {tab("login", "Đăng nhập")}{tab("register", "Tạo tài khoản")}
        </div>
      ) : (
        <h1 className="mb-1 text-xl font-semibold">{title}</h1>
      )}

      {mode === "login" && (
        <form onSubmit={login} className="space-y-3">
          <h1 className="sr-only">Đăng nhập</h1>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required autoFocus
            placeholder="Tên đăng nhập" aria-label="Tên đăng nhập" className={field} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required
            placeholder="Mật khẩu" aria-label="Mật khẩu" className={field} />
          {error && <Alert>{error}</Alert>}
          <button disabled={busy} className={`${btn.primary} w-full`}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={register} className="space-y-3">
          <h1 className="sr-only">Tạo tài khoản</h1>
          <div>
            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoComplete="username" autoCapitalize="none" required autoFocus
              minLength={4} maxLength={30} pattern="[a-z0-9._]{4,30}" placeholder="Tên đăng nhập" aria-label="Tên đăng nhập" aria-describedby="username-hint" className={field} />
            <p id="username-hint" className="mt-1 text-xs text-stone-500">4–30 ký tự: chữ không dấu, số, dấu chấm hoặc gạch dưới.</p>
          </div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8}
            placeholder="Mật khẩu (tối thiểu 8 ký tự)" aria-label="Mật khẩu" className={field} />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={8}
            placeholder="Nhập lại mật khẩu" aria-label="Nhập lại mật khẩu" className={field} />
          {confirm && password !== confirm && <p className="text-sm text-red-700">Hai lần nhập mật khẩu chưa khớp.</p>}
          {error && <Alert>{error}</Alert>}
          <button disabled={busy || password !== confirm} className={`${btn.primary} w-full`}>{busy ? "Đang tạo…" : "Tạo tài khoản"}</button>
          <p className="text-xs text-stone-500">Không cần số điện thoại hay CCCD. Chỉ Nhà vườn/Shop mới cần xác thực thêm.</p>
        </form>
      )}

      {mode === "phone" && (
        <form onSubmit={requestOtp} className="space-y-3">
          <p className="text-sm text-stone-500">Dành cho Nhà vườn/Shop và tài khoản đã gắn số điện thoại.</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" required autoFocus
            placeholder="Số điện thoại" aria-label="Số điện thoại" className={field} />
          {error && <Alert>{error}</Alert>}
          <button disabled={busy} className={`${btn.primary} w-full`}>{busy ? "Đang gửi…" : "Gửi mã OTP"}</button>
        </form>
      )}

      {mode === "code" && (
        <form onSubmit={verifyOtp} className="space-y-3">
          <p className="text-sm">Mã OTP đã gửi tới <b>{phone}</b>. <button type="button" onClick={() => go("phone")} className="text-emerald-700 underline">Đổi số</button></p>
          {devCode && <Alert kind="info">Môi trường phát triển — mã OTP: <b className="tracking-widest">{devCode}</b></Alert>}
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
            placeholder="Mã 6 số" aria-label="Mã OTP" className={`${field} text-center text-lg tracking-[0.5em]`} />
          {error && <Alert>{error}</Alert>}
          <button disabled={busy || code.length !== 6} className={`${btn.primary} w-full`}>{busy ? "Đang xác thực…" : "Xác nhận"}</button>
        </form>
      )}

      {mode === "admin" && (
        <form onSubmit={adminLogin} className="space-y-3">
          <p className="text-sm text-stone-500">Dành cho đội vận hành Chạm Xanh.</p>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required placeholder="Tên đăng nhập" aria-label="Tên đăng nhập" className={field} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required placeholder="Mật khẩu" aria-label="Mật khẩu" className={field} />
          <input value={totp} onChange={(e) => setTotp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Mã 2FA (nếu đã bật)" aria-label="Mã 2FA" className={field} />
          {error && <Alert>{error}</Alert>}
          <button disabled={busy} className={`${btn.primary} w-full`}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
        </form>
      )}

      <div className="mt-5 flex flex-col gap-2 border-t border-stone-100 pt-4 text-center text-sm">
        {mode !== "login" && mode !== "register" && <button type="button" onClick={() => go("login")} className="text-emerald-700 underline">← Đăng nhập bằng tên đăng nhập</button>}
        {mode !== "phone" && mode !== "code" && <button type="button" onClick={() => go("phone")} className="text-emerald-700 underline">Nhà vườn/Shop: đăng nhập bằng số điện thoại</button>}
        {mode !== "admin" && <button type="button" onClick={() => go("admin")} className="text-stone-400 hover:text-stone-600">Đăng nhập quản trị</button>}
      </div>
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
