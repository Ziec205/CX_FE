"use client";

import { useEffect, useState } from "react";
import { Alert, Card, ListState, PageTitle, Pill, btn, input } from "@/admin/components/ui";
import { useAdmin } from "@/admin/components/AdminContext";
import { api, errorText } from "@/admin/lib/api";

interface TokenRow { id: string; name: string; permissions: string[]; createdAt: string; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null }

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
          <Alert kind="warn">Token chỉ hiện một lần. Hãy sao chép ngay; đóng khung này hoặc tải lại trang sẽ không xem lại được.</Alert>
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
          {rows.length > 0 && (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-left text-stone-500"><tr><th className="py-2">Tên</th><th>Quyền</th><th>Hạn</th><th>Dùng lần cuối</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {rows.map((t) => {
                  const expired = new Date(t.expiresAt).getTime() < now;
                  const live = !t.revokedAt && !expired;
                  return (
                    <tr key={t.id} className="border-t border-stone-100">
                      <td className="py-2 font-medium">{t.name}</td>
                      <td>{t.permissions.map(permLabel).join(", ")}</td>
                      <td>{new Date(t.expiresAt).toLocaleDateString("vi-VN")}</td>
                      <td>{when(t.lastUsedAt)}</td>
                      <td>{t.revokedAt ? <Pill value="Revoked" label="Đã thu hồi" /> : expired ? <Pill value="Expired" label="Hết hạn" /> : <Pill value="Active" label="Đang dùng" />}</td>
                      <td className="text-right">{live && <button onClick={() => revoke(t)} className={btn.danger}>Thu hồi</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
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
