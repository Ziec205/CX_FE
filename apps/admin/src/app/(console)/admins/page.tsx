"use client";

import { useEffect, useState } from "react";
import { Alert, Card, PageTitle, btn, input } from "@/components/ui";
import { api, errorText } from "@/lib/api";

interface AdminRow { id: string; username: string; displayName: string; roles: string[]; totpEnabled: boolean }

const ROLES: [string, string][] = [
  ["SuperAdmin", "Super Admin"], ["Moderator", "Kiểm duyệt viên"], ["Verification", "Duyệt hồ sơ"], ["Support", "CSKH"],
  ["Accountant", "Kế toán"], ["Editor", "Biên tập"], ["FieldSales", "Đội thị trường"], ["Marketing", "Marketing"],
];

export default function AdminsPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [form, setForm] = useState({ username: "", displayName: "", password: "", roles: [] as string[] });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<AdminRow[]>("admin/users").then((r) => { if (!cancelled) setRows(r); }, (e) => { if (!cancelled) setMsg({ kind: "err", text: errorText(e) }); });
    return () => { cancelled = true; };
  }, [reload]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("admin/users", { method: "POST", json: form });
      setMsg({ kind: "ok", text: `Đã tạo ${form.username}. Người này cần đăng nhập và bật 2FA.` });
      setForm({ username: "", displayName: "", password: "", roles: [] });
      setReload((x) => x + 1);
    } catch (err) { setMsg({ kind: "err", text: errorText(err) }); }
  }

  return (
    <div className="max-w-5xl">
      <PageTitle title="Tài khoản quản trị" subtitle="Phân quyền theo vai trò (tài liệu 02 §4.1)" />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="text-left text-stone-500"><tr><th className="py-2">Tên đăng nhập</th><th>Tên</th><th>Vai trò</th><th>2FA</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-stone-100">
                  <td className="py-2 font-medium">{r.username}</td><td>{r.displayName}</td>
                  <td>{r.roles.map((x) => ROLES.find(([k]) => k === x)?.[1] ?? x).join(", ")}</td>
                  <td>{r.totpEnabled ? "✔" : <span className="text-amber-700">chưa bật</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Tạo tài khoản">
          <form onSubmit={create} className="space-y-2 text-sm">
            <input required placeholder="Tên đăng nhập" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={`${input} w-full`} />
            <input required placeholder="Tên hiển thị" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className={`${input} w-full`} />
            <input required type="password" minLength={12} placeholder="Mật khẩu (≥ 12 ký tự)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${input} w-full`} />
            <div className="grid grid-cols-2 gap-1">
              {ROLES.map(([k, l]) => (
                <label key={k} className="flex items-center gap-1">
                  <input type="checkbox" checked={form.roles.includes(k)}
                    onChange={(e) => setForm({ ...form, roles: e.target.checked ? [...form.roles, k] : form.roles.filter((x) => x !== k) })} />{l}
                </label>
              ))}
            </div>
            <button disabled={form.roles.length === 0} className={`${btn.primary} w-full`}>Tạo</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
