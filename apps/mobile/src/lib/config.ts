// Địa chỉ API: đặt EXPO_PUBLIC_API_URL khi build (vd https://api.chamxanh.vn).
// Chạy trên máy thật khi dev: dùng IP LAN của máy chạy BE (vd http://192.168.1.10:5080), không dùng localhost.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5080").replace(/\/$/, "");

export const mediaUrl = (path?: string | null) => (path ? (path.startsWith("http") ? path : `${API_URL}${path}`) : undefined);
