/** Chuỗi trông như số điện thoại (chỉ số, khoảng trắng, dấu chấm/gạch, có thể có +84) → đăng nhập OTP; ngược lại là tên đăng nhập quản trị. */
export const isPhoneLike = (s: string) => /^\+?[\d\s.\-()]{8,}$/.test(s.trim());

/** Chỉ cho quay lại đường dẫn nội bộ (chặn chuyển hướng ra trang ngoài). */
export const safeNext = (raw?: string | null) => (raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/");
