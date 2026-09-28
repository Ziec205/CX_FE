import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:5080";

const nextConfig: NextConfig = {
  // Ảnh công khai do BE phục vụ, URL bất biến nên CDN cache được lâu (tài liệu 06 §4)
  async rewrites() {
    return [{ source: "/media/:path*", destination: `${API_URL}/media/:path*` }];
  },
};

export default nextConfig;
