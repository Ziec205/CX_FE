import type { PlanCode } from "@/lib/types";

/** Avatar chữ cái đầu, viền theo gói: Xanh Plus (39k) viền xanh lá, Xanh Pro (69k) viền vàng ánh kim kèm nhãn PRO. */
export function PlanAvatar({ initial, plan, size = "md" }: { initial: string; plan?: PlanCode | null; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "h-11 w-11 text-lg" : "h-9 w-9";
  const face = (
    <span className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-wood-400 font-display font-bold text-stone-900`}>
      {initial || (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" strokeLinecap="round" /></svg>
      )}
    </span>
  );
  if (plan === "Pro")
    return (
      <span className="relative inline-flex shrink-0 rounded-full bg-[conic-gradient(from_200deg,#f6d365,#c8962e,#fff1b8,#e0a526,#f6d365)] p-[3px] shadow-[0_0_0_1px_rgba(161,98,7,0.35)]" title="Gói Xanh Pro">
        <span className="rounded-full bg-white p-[2px]">{face}</span>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-1.5 text-[9px] font-extrabold leading-4 tracking-wider text-wood-400">PRO</span>
      </span>
    );
  if (plan === "Plus")
    return (
      <span className="relative inline-flex shrink-0 rounded-full bg-emerald-600 p-[3px]" title="Gói Xanh Plus">
        <span className="rounded-full bg-white p-[2px]">{face}</span>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-emerald-700 px-1.5 text-[9px] font-extrabold leading-4 tracking-wider text-white">PLUS</span>
      </span>
    );
  return face;
}
