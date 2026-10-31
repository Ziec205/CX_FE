export const btn = {
  primary: "cx-press inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600",
  secondary: "cx-press inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-[15px] font-semibold text-emerald-900 ring-1 ring-stone-300 hover:ring-emerald-700 disabled:opacity-40",
  danger: "inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-[15px] font-semibold text-red-700 ring-1 ring-red-300 hover:bg-red-50 disabled:opacity-40",
  small: "rounded-full bg-white px-3 py-1.5 text-sm font-medium ring-1 ring-stone-300 hover:ring-emerald-700 disabled:opacity-40",
  ghost: "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[15px] font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900",
};

export const field = "w-full rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-[15px] placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

export function Alert({ kind = "err", children }: { kind?: "ok" | "err" | "warn" | "info"; children: React.ReactNode }) {
  const cls = { ok: "bg-emerald-50 text-emerald-800", err: "bg-red-50 text-red-800", warn: "bg-wood-100 text-wood-800", info: "bg-emerald-50 text-emerald-900" }[kind];
  return <div className={`rounded-2xl px-4 py-3 text-[15px] ${cls}`}>{children}</div>;
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="cx-card">
      <div className="mb-4 flex items-center justify-between gap-2"><h2 className="cx-h2">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

/** Đầu trang thống nhất: tiêu đề lớn, câu dẫn, nút hành động bên phải. */
export function PageHeader({ title, lead, action, eyebrow }: { title: React.ReactNode; lead?: React.ReactNode; action?: React.ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className="cx-eyebrow">{eyebrow}</p>}
        <h1 className="cx-h1">{title}</h1>
        {lead && <p className="cx-lead max-w-2xl">{lead}</p>}
      </div>
      {action}
    </header>
  );
}

export function Label({ text, required, children, hint }: { text: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-[15px]">
      <span className="mb-1.5 block font-semibold text-stone-800">{text}{required && <span className="text-red-700"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-stone-500">{hint}</span>}
    </label>
  );
}
