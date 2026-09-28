"use client";

import dynamic from "next/dynamic";

// Leaflet dùng window nên chỉ tải ở trình duyệt.
export const MapLoader = dynamic(() => import("./GardenMap").then((m) => m.GardenMap), {
  ssr: false,
  loading: () => <div className="h-[70vh] animate-pulse rounded-xl bg-stone-100" />,
});
