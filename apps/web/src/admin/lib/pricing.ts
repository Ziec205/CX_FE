export { api, formatDate, formatVnd, type ApiError } from "./api";

export type PriceBookStatus = "Draft" | "PendingApproval" | "Scheduled" | "Active" | "Expired" | "Rejected";

export interface PriceGroup { code: string; name: string; categoryIds: string[] }
export interface ListingServicePrice {
  code: string; enabled: boolean; days?: number | null; perDay?: number | null; labelName?: string | null;
  prices: Record<string, number>;
}
export interface GardenPlan { months: number; priceVnd: number; enabled: boolean }
export interface TopUpPackage {
  code: string; name: string; priceVnd: number; xu: number; bonusXu: number; bonusExpiryDays: number;
  popular: boolean; enabled: boolean;
}
export interface EscrowFee { pct: number; minVnd: number; maxVnd: number; payer: string; orderMinVnd: number; orderMaxVnd: number }

export interface PriceBook {
  id: string; version: number; status: PriceBookStatus;
  effectiveFrom?: string | null; effectiveTo?: string | null;
  priceGroups: PriceGroup[]; listingServices: ListingServicePrice[];
  multipliers: unknown[]; prioritySlots: unknown;
  gardenPlans: GardenPlan[]; gardenPlanRules: unknown;
  topUpPackages: TopUpPackage[]; escrowFee: EscrowFee;
  createdBy: string; approvedBy?: string | null; changeNote?: string | null; rejectReason?: string | null;
  createdAt: string; approvedAt?: string | null;
}

export interface ValidationIssue { field: string; message: string }
export interface ValidationResult { errors: ValidationIssue[]; warnings: ValidationIssue[]; isValid: boolean }

export const STATUS_LABEL: Record<PriceBookStatus, string> = {
  Draft: "Nháp", PendingApproval: "Chờ duyệt", Scheduled: "Đã lên lịch",
  Active: "Đang hiệu lực", Expired: "Hết hiệu lực", Rejected: "Bị từ chối",
};

export const SERVICE_LABEL: Record<string, string> = {
  BUMP: "Đẩy tin", AUTO_BUMP: "Đẩy tự động", PRIORITY: "Tin Ưu tiên", LABEL: "Nhãn nổi bật",
};

export function serviceName(s: ListingServicePrice) {
  const base = SERVICE_LABEL[s.code] ?? s.code;
  if (s.code === "AUTO_BUMP") return `${base} (${s.perDay}/ngày × ${s.days} ngày)`;
  if (s.code === "LABEL") return `${base} "${s.labelName}" ${s.days} ngày`;
  return s.days ? `${base} ${s.days} ngày` : base;
}
