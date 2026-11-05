"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Alert, btn, field } from "@/components/ui";
import { safeNext } from "@/lib/login";

type Mode = "login" | "register" | "admin";

/**
 * Trang đăng nhập chung cho hai vai trò:
 * - Thành viên: tên đăng nhập + mật khẩu (đăng ký chỉ cần nhập mật khẩu 2 lần, không cần SĐT/CCCD).
 * - Quản trị: tên đăng nhập + mật khẩu (không dùng 2FA), chuyển vào /quan-tri.
 */
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<Mode>(params.get("admin") ? "admin" : params.get("dang-ky") ? "register" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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

  const adminLogin = run(async () => {
    await post("/api/admin-auth/login", { username: username.trim(), password, totpCode: null });
    router.replace(next.startsWith("/quan-tri") ? next : "/quan-tri");
    router.refresh();
  });

  const go = (m: Mode) => { setMode(m); setError(undefined); setPassword(""); setConfirm(""); };

  const title = { login: "Đăng nhập", register: "Tạo tài khoản", admin: "Đăng nhập quản trị" }[mode];

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-center text-2xl font-bold text-stone-900">{title}</h1>

      {mode === "login" && (
        <form onSubmit={login} className="space-y-3">
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
          <p className="text-xs text-stone-500">Không cần số điện thoại hay CCCD.</p>
        </form>
      )}

      {mode === "admin" && (
        <form onSubmit={adminLogin} className="space-y-3">
          <p className="text-sm text-stone-500">Dành cho đội vận hành Chạm Xanh.</p>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required placeholder="Tên đăng nhập" aria-label="Tên đăng nhập" className={field} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required placeholder="Mật khẩu" aria-label="Mật khẩu" className={field} />
          {error && <Alert>{error}</Alert>}
          <button disabled={busy} className={`${btn.primary} w-full`}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-3 text-center text-sm">
        {mode === "login" && <p className="text-stone-600">Bạn chưa có tài khoản? <button type="button" onClick={() => go("register")} className="font-bold text-emerald-600 hover:underline">Đăng ký ngay</button></p>}
        {mode === "register" && <p className="text-stone-600">Đã có tài khoản? <button type="button" onClick={() => go("login")} className="font-bold text-emerald-600 hover:underline">Đăng nhập</button></p>}
        {mode === "admin" && <button type="button" onClick={() => go("login")} className="text-emerald-700 underline">← Đăng nhập thành viên</button>}
        {mode !== "admin" && <button type="button" onClick={() => go("admin")} className="text-stone-500 hover:text-stone-700">Đăng nhập quản trị</button>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
