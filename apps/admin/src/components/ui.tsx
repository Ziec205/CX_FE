export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Alert({ kind = "err", children }: { kind?: "ok" | "err" | "warn"; children: React.ReactNode }) {
  const cls = kind === "ok" ? "bg-emerald-50 text-emerald-800" : kind === "warn" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700";
  return <p className={`mb-4 rounded p-3 text-sm ${cls}`}>{children}</p>;
}

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-stone-200 bg-white p-4 ${className}`}>
      {title && <h2 className="mb-3 font-medium">{title}</h2>}
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
  primary: "rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40",
  secondary: "rounded border border-stone-300 bg-white px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-40",
  danger: "rounded border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40",
};

export const input = "rounded border border-stone-300 px-2 py-1.5 text-sm";
