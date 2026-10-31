/** Chỉ cho quay lại đường dẫn nội bộ (chặn chuyển hướng ra trang ngoài). */
export const safeNext = (raw?: string | null) => (raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/");
