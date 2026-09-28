import type { Metadata } from "next";
import { MapLoader } from "./MapLoader";

export const metadata: Metadata = { title: "Bản đồ nhà vườn", description: "Tìm nhà vườn, shop cây cảnh gần bạn và vườn đang có loài cây bạn cần." };

export default function MapPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Bản đồ nhà vườn</h1>
      <MapLoader />
    </div>
  );
}
