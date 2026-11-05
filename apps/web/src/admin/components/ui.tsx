export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-stone-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Alert({ kind = "err", children }: { kind?: "ok" | "err" | "warn"; children: React.ReactNode }) {
  const cls = kind === "ok" ? "bg-emerald-50 text-emerald-800" : kind === "warn" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700";
  return <p className={`mb-4 rounded-2xl p-3 text-sm ${cls}`}>{children}</p>;
}

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-stone-300 bg-white p-4 ${className}`}>
      {title && <h2 className="mb-3 font-bold text-stone-900">{title}</h2>}
      {children}
    </section>
  );
}

const PILL: Record<string, string> = {
  Priority: "bg-red-100 text-red-700", Normal: "bg-stone-100 text-stone-700", Audit: "bg-sky-100 text-sky-700",
  Active: "bg-emerald-100 text-emerald-800", PendingReview: "bg-amber-100 text-amber-800", Rejected: "bg-red-100 text-red-700",
  Removed: "bg-red-100 text-red-700", TempHidden: "bg-orange-100 text-orange-800", Submitted: "bg-amber-100 text-amber-800",
  Verified: "bg-emerald-100 text-emerald-800", NeedsInfo: "bg-sky-100 text-sky-700", Revoked: "bg-red-100 text-red-700",
};

export function Pill({ value, label }: { value: string; label?: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILL[value] ?? "bg-stone-100 text-stone-700"}`}>{label ?? value}</span>;
}

export const btn = {
  primary: "inline-block rounded-full bg-wood-400 px-4 py-2 text-sm font-bold text-stone-900 hover:brightness-95 disabled:opacity-40",
  secondary: "inline-block rounded-full bg-[#efedec] px-4 py-2 text-sm font-medium text-stone-900 hover:brightness-95 disabled:opacity-40",
  danger: "inline-block rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40",
};

export const input = "max-w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm";

/** Dòng trạng thái dùng chung: đang tải / không có dữ liệu. */
export function ListState({ loading, empty, text = "Không có dữ liệu." }: { loading: boolean; empty: boolean; text?: string }) {
  if (loading) return <p className="py-6 text-center text-sm text-stone-500">Đang tải…</p>;
  return empty ? <p className="py-6 text-center text-sm text-stone-500">{text}</p> : null;
}

export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Trang" className="mt-3 flex items-center justify-center gap-3 text-sm">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className={btn.secondary}>← Trước</button>
      <span>Trang {page}/{pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className={btn.secondary}>Sau →</button>
    </nav>
  );
}
