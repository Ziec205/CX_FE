"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText, type ApiError } from "@/lib/api";
import { paramsToSavedQuery } from "@/lib/search";
import { btn } from "./ui";


/** Lưu bộ lọc hiện tại để được báo khi có tin mới khớp (03 §5.4). */
export function SaveSearchButton({ params, label }: { params: Record<string, string>; label: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saved" | string>("idle");

  async function save() {
    const query = paramsToSavedQuery(params);
    try {
      await api("me/saved-searches", { method: "POST", json: { name: label, query } });
      setState("saved");
    } catch (e) {
      if ((e as ApiError).status === 401) router.push(`/dang-nhap?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      else setState(errorText(e));
    }
  }

  if (state === "saved") return <span className="text-sm text-emerald-700">✓ Đã lưu — xem ở mục Đã lưu</span>;
  return (
    <span className="flex items-center gap-2">
      <button onClick={save} className={btn.small}>🔔 Lưu tìm kiếm</button>
      {state !== "idle" && <span className="text-xs text-red-700">{state}</span>}
    </span>
  );
}
