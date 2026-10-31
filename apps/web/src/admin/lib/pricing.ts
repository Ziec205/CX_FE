export { api, formatDate, formatVnd, type ApiError } from "./api";

export type PriceBookStatus = "Draft" | "PendingApproval" | "Scheduled" | "Active" | "Expired" | "Rejected";

export interface TopUpPackage {
  code: string; name: string; priceVnd: number; xu: number; bonusXu: number; bonusExpiryDays: number;
  popular: boolean; enabled: boolean;
}

export interface PriceBook {
  id: string; version: number; status: PriceBookStatus;
  effectiveFrom?: string | null; effectiveTo?: string | null;
  topUpPackages: TopUpPackage[];
  createdBy: string; approvedBy?: string | null; changeNote?: string | null; rejectReason?: string | null;
  createdAt: string; approvedAt?: string | null;
}

export interface ValidationIssue { field: string; message: string }
export interface ValidationResult { errors: ValidationIssue[]; warnings: ValidationIssue[]; isValid: boolean }

export const STATUS_LABEL: Record<PriceBookStatus, string> = {
  Draft: "Nháp", PendingApproval: "Chờ duyệt", Scheduled: "Đã lên lịch",
  Active: "Đang hiệu lực", Expired: "Hết hiệu lực", Rejected: "Bị từ chối",
};
