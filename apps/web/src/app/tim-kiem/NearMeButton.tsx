"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function NearMeButton({ basePath = "/tim-kiem" }: { basePath?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState<string>();

  function locate() {
    if (!navigator.geolocation) return setMsg("Trình duyệt không hỗ trợ định vị");
    setMsg("Đang lấy vị trí…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const n = new URLSearchParams(sp.toString());
        n.set("lat", pos.coords.latitude.toFixed(4));
        n.set("lng", pos.coords.longitude.toFixed(4));
        n.set("radiusKm", n.get("radiusKm") ?? "20");
        n.set("sort", "Nearest");
        n.delete("page");
        router.push(`${basePath}?${n}`);
      },
      () => setMsg("Bạn chưa cho phép truy cập vị trí"),
    );
  }

  return (
    <div>
      <button type="button" onClick={locate} className="w-full rounded-full border border-emerald-700 py-2.5 font-bold text-emerald-800">Tìm gần tôi</button>
      {msg && <p className="mt-1 text-xs text-stone-500">{msg}</p>}
    </div>
  );
}
