"use client";

import { useEffect, useState } from "react";
import { Alert, Card, ListState, PageTitle, Pill, btn, input } from "@/admin/components/ui";
import { useAdmin } from "@/admin/components/AdminContext";
import { api, errorText } from "@/admin/lib/api";

interface TokenRow { id: string; name: string; permissions: string[]; createdAt: string; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null; canReveal: boolean }

/** Khớp Perm.All ở BE (Common/Auth/Permissions.cs). */
const PERMS: [string, string][] = [
  ["listing.moderate", "Kiểm duyệt tin"], ["user.sanction", "Xử lý người dùng"], ["user.ban_permanent", "Cấm vĩnh viễn"],
  ["dispute.resolve", "Xử lý hỗ trợ"], ["wallet.adjust", "Điều chỉnh ví"], ["catalog.manage", "Quản lý danh mục"],
  ["content.manage", "Quản lý nội dung"], ["pricing.view", "Xem bảng giá"], ["pricing.edit", "Sửa bảng giá"],
  ["pricing.approve", "Duyệt bảng giá"], ["promo.manage", "Quản lý khuyến mãi"], ["moderation.config", "Cấu hình kiểm duyệt"],
  ["reports.view", "Xem báo cáo, nhật ký"], ["admin.manage", "Quản lý tài khoản admin"],
];
const FULL_ACCESS_DAYS = 30;
const EMPTY_FORM = { name: "", permissions: [] as string[], days: 90 };
const permLabel = (p: string) => PERMS.find(([k]) => k === p)?.[1] ?? p;
const when = (s: string | null) => (s ? new Date(s).toLocaleString("vi-VN") : "Chưa dùng");

/** Ô token: mặc định che, bấm con mắt mới lấy token từ máy chủ (mỗi lần xem được ghi audit). */
function TokenSecret({ row, live }: { row: TokenRow; live: boolean }) {
  const [value, setValue] = useState<string>();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  if (!live) return <code className="block rounded-xl bg-stone-100 p-3 text-sm text-stone-500">Token không còn hiệu lực</code>;
  if (!row.canReveal) return <code className="block rounded-xl bg-stone-100 p-3 text-sm text-stone-500">Token cũ không xem lại được. Hãy thu hồi và tạo token mới.</code>;
  async function toggle() {
    setError(undefined);
    if (value) { setValue(undefined); setCopied(false); return; }
    try { setValue((await api<{ token: string }>(`admin/agent-tokens/${row.id}/reveal`, { method: "POST" })).token); }
    catch (e) { setError(errorText(e)); }
  }
  async function copy() {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); setCopied(true); }
    catch { setError("Không sao chép được, hãy chọn và sao chép thủ công."); }
  }
  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl bg-stone-100 p-2 pl-3">
        <code className="min-w-0 flex-1 break-all text-sm">{value ?? "••••••••••••••••••••••••••••••••"}</code>
        {value && <button type="button" onClick={copy} className="shrink-0 px-2 text-sm font-semibold text-emerald-700">{copied ? "Đã chép" : "Sao chép"}</button>}
        <button type="button" onClick={toggle} aria-label={value ? "Ẩn token" : "Hiện token"} aria-pressed={!!value} className="shrink-0 rounded-full p-2 text-stone-600 hover:bg-stone-200">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />{value && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export default function AgentTokensPage() {
  const { can } = useAdmin();
  const [rows, setRows] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [created, setCreated] = useState<{ name: string; token: string }>();
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();
  const [reload, setReload] = useState(0);
  const [now] = useState(() => Date.now());
  const allowed = can("admin.manage");
  const full = PERMS.every(([k]) => form.permissions.includes(k));

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    api<TokenRow[]>("admin/agent-tokens").then(
      (r) => { if (!cancelled) { setRows(r); setLoading(false); } },
      (e) => { if (!cancelled) { setMsg({ kind: "err", text: errorText(e) }); setLoading(false); } },
    );
    return () => { cancelled = true; };
  }, [reload, allowed]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(undefined);
    try {
      const r = await api<{ name: string; token: string }>("admin/agent-tokens", { method: "POST", json: form });
      setCreated({ name: r.name, token: r.token });
      setCopied(false);
      setForm(EMPTY_FORM);
      setReload((x) => x + 1);
    } catch (err) { setMsg({ kind: "err", text: errorText(err) }); }
  }

  async function revoke(t: TokenRow) {
    if (!confirm(`Thu hồi token "${t.name}"? Trợ lý dùng token này sẽ mất quyền truy cập ngay.`)) return;
    try {
      await api(`admin/agent-tokens/${t.id}`, { method: "DELETE" });
      setMsg({ kind: "ok", text: `Đã thu hồi ${t.name}.` });
      setReload((x) => x + 1);
    } catch (err) { setMsg({ kind: "err", text: errorText(err) }); }
  }

  async function copy() {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.token); setCopied(true); }
    catch { setMsg({ kind: "err", text: "Không sao chép được, hãy chọn và sao chép thủ công." }); }
  }

  if (!allowed) return <Alert>Bạn không có quyền xem trang này.</Alert>;

  return (
    <div className="max-w-5xl">
      <PageTitle title="Token trợ lý AI" subtitle="Cho phép trợ lý AI quản trị nội dung qua cổng MCP. Mọi thao tác đều ghi vào nhật ký audit." />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {created && (
        <Card title={`Token của ${created.name}`} className="mb-4">
          <Alert kind="warn">Hãy lưu token ở nơi an toàn. Bạn có thể xem lại bằng nút con mắt khi token còn hiệu lực; mỗi lần xem đều được ghi nhật ký.</Alert>
          <code className="block break-all rounded-xl bg-stone-100 p-3 text-sm">{created.token}</code>
          <div className="mt-3 flex gap-2">
            <button onClick={copy} className={btn.primary}>{copied ? "Đã sao chép" : "Sao chép"}</button>
            <button onClick={() => setCreated(undefined)} className={btn.secondary}>Đóng</button>
          </div>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <ListState loading={loading} empty={rows.length === 0} text="Chưa có token nào." />
          <div className="space-y-3">
            {rows.map((t) => {
              const expired = new Date(t.expiresAt).getTime() < now;
              const live = !t.revokedAt && !expired;
              return (
                <article key={t.id} className="space-y-3 rounded-2xl border border-stone-200 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="min-w-0 break-words text-base font-bold text-stone-900">{t.name}</h3>
                    <div className="flex items-center gap-2">
                      {t.revokedAt ? <Pill value="Revoked" label="Đã thu hồi" /> : expired ? <Pill value="Expired" label="Hết hạn" /> : <Pill value="Active" label="Đang dùng" />}
                      {live && <button onClick={() => revoke(t)} className={btn.danger}>Thu hồi</button>}
                    </div>
                  </div>
                  <TokenSecret row={t} live={live} />
                  <p className="text-stone-500">Hạn {new Date(t.expiresAt).toLocaleDateString("vi-VN")} · Dùng lần cuối: {when(t.lastUsedAt)}</p>
                  <p className="text-stone-700">{t.permissions.length === PERMS.length ? "Toàn quyền" : t.permissions.map(permLabel).join(", ")}</p>
                </article>
              );
            })}
          </div>
        </Card>
        <Card title="Tạo token">
          <form onSubmit={create} className="space-y-3 text-sm">
            <input required minLength={2} maxLength={60} placeholder="Tên, ví dụ: Claude" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${input} w-full`} />
            <fieldset className="space-y-1">
              <legend className="mb-1 text-stone-500">Quyền</legend>
              <button type="button" className={`${btn.secondary} mb-2`} onClick={() => setForm(full ? { ...form, permissions: [] } : { ...form, permissions: PERMS.map(([k]) => k), days: Math.min(form.days, FULL_ACCESS_DAYS) })}>
                {full ? "Bỏ toàn quyền" : "Toàn quyền"}
              </button>
              {PERMS.map(([k, l]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={form.permissions.includes(k)}
                    onChange={(e) => setForm({ ...form, permissions: e.target.checked ? [...form.permissions, k] : form.permissions.filter((x) => x !== k) })} />{l}
                </label>
              ))}
            </fieldset>
            {full && <Alert kind="warn">Toàn quyền cho phép trợ lý điều chỉnh ví, cấm tài khoản, sửa bảng giá và quản lý admin. Lộ token là lộ toàn bộ quyền này. Nên đặt hạn ngắn (mặc định {FULL_ACCESS_DAYS} ngày) và thu hồi khi xong việc.</Alert>}
            <label className="block">
              <span className="mb-1 block text-stone-500">Số ngày hiệu lực (1–365)</span>
              <input required type="number" min={1} max={365} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} className={`${input} w-full`} />
            </label>
            <button disabled={form.permissions.length === 0} className={`${btn.primary} w-full`}>Tạo token</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
