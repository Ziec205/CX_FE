export const btn = {
  primary: "rounded-full bg-emerald-800 px-5 py-2.5 text-[15px] font-bold text-stone-50 hover:bg-emerald-700 disabled:opacity-40",
  secondary: "rounded-full border border-emerald-800/30 bg-white px-5 py-2.5 text-[15px] text-emerald-900 hover:border-emerald-800 disabled:opacity-40",
  danger: "rounded-full border border-red-300 bg-white px-5 py-2.5 text-[15px] text-red-700 hover:bg-red-50 disabled:opacity-40",
  small: "rounded-full border border-stone-300 bg-white px-3 py-1 text-sm hover:border-emerald-700 disabled:opacity-40",
};

export const field = "w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-[15px] placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none";

export function Alert({ kind = "err", children }: { kind?: "ok" | "err" | "warn" | "info"; children: React.ReactNode }) {
  const cls = { ok: "bg-emerald-50 text-emerald-800", err: "bg-red-50 text-red-800", warn: "bg-wood-100 text-wood-800", info: "bg-emerald-50 text-emerald-900" }[kind];
  return <div className={`rounded-xl px-4 py-3 text-[15px] ${cls}`}>{children}</div>;
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-2xl text-emerald-800">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export function Label({ text, required, children, hint }: { text: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-[15px]">
      <span className="mb-1.5 block font-bold text-stone-800">{text}{required && <span className="text-red-700"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-stone-500">{hint}</span>}
    </label>
  );
}
