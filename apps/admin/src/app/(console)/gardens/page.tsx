"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/AdminContext";
import { Alert, Card, PageTitle, Pill, btn } from "@/components/ui";
import { api, errorText, formatDate } from "@/lib/api";

interface GardenRow {
  profile: { id: string; slug: string; name: string; type: string; address: string; provinceId: string; lat: number; lng: number;
    photos: string[]; ownerId: string; verified: boolean; tick: boolean; founding: boolean };
  status: string; reviewNote?: string; plan?: { endAt: string } | null;
  bank?: { bankCode: string; accountNoMasked: string; accountName: string } | null;
}
interface Kyc { idNumber: string; fullName: string; dob: string; documents: string[]; method: string; businessLicenseNo?: string; bankAccountNo?: string; bankAccountName?: string }

const STATUSES = [["Submitted", "Chờ duyệt"], ["NeedsInfo", "Chờ bổ sung"], ["Verified", "Đã xác minh"], ["Rejected", "Từ chối"], ["Revoked", "Thu hồi"]];

export default function GardensPage() {
  const { can } = useAdmin();
  const [status, setStatus] = useState("Submitted");
  const [rows, setRows] = useState<GardenRow[]>([]);
  const [kyc, setKyc] = useState<Record<string, Kyc>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<GardenRow[]>(`admin/gardens?status=${status}`)
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((e) => { if (!cancelled) setMsg({ kind: "err", text: errorText(e) }); });
    return () => { cancelled = true; };
  }, [status, reload]);

  async function showKyc(id: string) {
    try { setKyc({ ...kyc, [id]: await api<Kyc>(`admin/gardens/${id}/kyc`) }); }
    catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  async function review(id: string, decision: string) {
    const note = decision === "Approve" ? null : prompt("Ghi chú lý do (bắt buộc)");
    if (decision !== "Approve" && !note) return;
    try {
      await api(`admin/gardens/${id}/review`, { method: "POST", json: { decision, note } });
      setMsg({ kind: "ok", text: "Đã cập nhật hồ sơ" });
      setReload((x) => x + 1);
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  async function grant(id: string) {
    const months = Number(prompt("Tặng bao nhiêu tháng gói Nhà vườn? (Nhà vườn Sáng lập: 6)", "6"));
    if (!months) return;
    try {
      await api(`admin/gardens/${id}/grant-plan`, { method: "POST", json: { months, founding: true } });
      setMsg({ kind: "ok", text: `Đã tặng ${months} tháng` });
      setReload((x) => x + 1);
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  return (
    <div className="max-w-6xl">
      <PageTitle title="Duyệt Nhà vườn / Shop" subtitle="Xác minh CCCD chủ vườn, ảnh vườn thật, tài khoản ngân hàng trùng tên" />
      <div className="mb-4 flex gap-2">
        {STATUSES.map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)} className={`rounded-full px-3 py-1 text-sm ${status === v ? "bg-emerald-600 text-white" : "bg-white ring-1 ring-stone-200"}`}>{l}</button>
        ))}
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {rows.length === 0 && <p className="text-stone-400">Không có hồ sơ.</p>}
      <div className="space-y-4">
        {rows.map((r) => {
          const g = r.profile;
          const k = kyc[g.id];
          return (
            <Card key={g.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2"><h2 className="text-lg font-medium">{g.name}</h2><Pill value={r.status} />{g.founding && <Pill value="Founding" label="Sáng lập" />}</div>
                  <p className="text-sm text-stone-500">{g.type === "Garden" ? "Nhà vườn" : "Shop"} · {g.address} · tỉnh {g.provinceId} · <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${g.lat},${g.lng}`}>xem bản đồ</a></p>
                  {r.bank && <p className="text-sm text-stone-500">Ngân hàng {r.bank.bankCode} · {r.bank.accountNoMasked} · {r.bank.accountName}</p>}
                  {r.plan && <p className="text-sm text-stone-500">Gói đến {formatDate(r.plan.endAt)}</p>}
                  {r.reviewNote && <p className="text-sm text-amber-700">Ghi chú: {r.reviewNote}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {can("kyc.view") && !k && <button onClick={() => showKyc(g.id)} className={btn.secondary}>Xem CCCD (ghi audit)</button>}
                  {r.status === "Submitted" && <>
                    <button onClick={() => review(g.id, "Approve")} className={btn.primary}>Duyệt</button>
                    <button onClick={() => review(g.id, "NeedsInfo")} className={btn.secondary}>Yêu cầu bổ sung</button>
                    <button onClick={() => review(g.id, "Reject")} className={btn.danger}>Từ chối</button>
                  </>}
                  {r.status === "Verified" && <>
                    <button onClick={() => grant(g.id)} className={btn.secondary}>Tặng gói</button>
                    <button onClick={() => review(g.id, "Revoke")} className={btn.danger}>Thu hồi</button>
                  </>}
                </div>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {g.photos.map((p) => <img key={p} src={p} alt="" className="h-28 w-28 shrink-0 rounded object-cover" />)}
              </div>
              {k && (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p>CCCD: <b>{k.idNumber}</b> · {k.fullName} · sinh {k.dob} · xác minh qua {k.method}{k.businessLicenseNo && ` · GPKD ${k.businessLicenseNo}`}</p>
                  <p>TK ngân hàng: {k.bankAccountNo} — {k.bankAccountName}</p>
                  <div className="mt-2 flex gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {k.documents.map((d) => <img key={d} src={`/api/proxy${d.replace(/^\/api/, "")}`} alt="CCCD" className="h-40 rounded" />)}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
