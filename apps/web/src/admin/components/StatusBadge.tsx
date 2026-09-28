import { STATUS_LABEL, type PriceBookStatus } from "@/admin/lib/pricing";

const COLORS: Record<PriceBookStatus, string> = {
  Draft: "bg-stone-100 text-stone-700",
  PendingApproval: "bg-amber-100 text-amber-800",
  Scheduled: "bg-sky-100 text-sky-800",
  Active: "bg-emerald-100 text-emerald-800",
  Expired: "bg-stone-100 text-stone-400",
  Rejected: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: PriceBookStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status]}`}>{STATUS_LABEL[status]}</span>;
}
