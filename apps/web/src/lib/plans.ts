import type { ApiError } from "./api";

/** Lỗi do gói (vượt số cây, hết lượt AI, cần gói Pro): hiện kèm nút xem gói. */
export const isPlanError = (e: unknown) => ["PLAN_LIMIT", "PLAN_REQUIRED", "AI_QUOTA_EXCEEDED"].includes((e as ApiError)?.code);

export const TERM_LABEL: Record<number, string> = { 1: "1 tháng", 12: "12 tháng" };

export const vnDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");
