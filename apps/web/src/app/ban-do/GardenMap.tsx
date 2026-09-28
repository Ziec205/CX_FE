"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { field } from "@/components/ui";
import { api } from "@/lib/api";
import type { Species } from "@/lib/types";

interface Pin { slug: string; name: string; type: string; lat: number; lng: number; allowVisit: boolean; openingHours?: string; thumb?: string | null }

const DEFAULT_CENTER: [number, number] = [10.4, 106.2]; // giữa TP.HCM và miền Tây (địa bàn thí điểm D-07)

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="background:#1f3a2b;border-radius:9999px;width:18px;height:18px;border:3px solid #fbf8f2;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function GardenMap() {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });
  const [radius, setRadius] = useState(100);
  const [speciesQ, setSpeciesQ] = useState("");
  const [species, setSpecies] = useState<Species[]>([]);
  const [speciesId, setSpeciesId] = useState("");
  const [count, setCount] = useState<number>();

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current).setView(DEFAULT_CENTER, 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("moveend", () => { const c = m.getCenter(); setCenter({ lat: c.lat, lng: c.lng }); });
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ lat: center.lat.toFixed(4), lng: center.lng.toFixed(4), radiusKm: String(radius), ...(speciesId && { speciesId }) });
      api<Pin[]>(`gardens/map?${qs}`).then((pins) => {
        if (cancelled || !layer.current) return;
        layer.current.clearLayers();
        for (const p of pins) {
          L.marker([p.lat, p.lng], { icon: pinIcon }).addTo(layer.current).bindPopup(
            `<div style="min-width:180px">${p.thumb ? `<img src="${esc(p.thumb)}" style="width:100%;height:90px;object-fit:cover;border-radius:6px"/>` : ""}
             <b>${esc(p.name)}</b><br/><small>${p.type === "Garden" ? "Nhà vườn" : "Shop"}${p.openingHours ? " · " + esc(p.openingHours) : ""}${p.allowVisit ? " · đón khách" : ""}</small><br/>
             <a href="/vuon/${encodeURIComponent(p.slug)}">Xem gian hàng</a> ·
             <a target="_blank" rel="noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}">Chỉ đường</a></div>`,
          );
        }
        setCount(pins.length);
      }, () => {});
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [center, radius, speciesId]);

  useEffect(() => {
    if (!speciesQ) return;
    let cancelled = false;
    const t = setTimeout(() => api<Species[]>(`species?q=${encodeURIComponent(speciesQ)}&limit=6`).then((r) => { if (!cancelled) setSpecies(r); }, () => {}), 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [speciesQ]);

  function locate() {
    navigator.geolocation?.getCurrentPosition((p) => map.current?.setView([p.coords.latitude, p.coords.longitude], 11));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="relative">
          <input value={speciesQ} onChange={(e) => { setSpeciesQ(e.target.value); if (!e.target.value) { setSpeciesId(""); setSpecies([]); } }}
            placeholder="Vườn đang có cây… (vd: mai vàng)" className={`${field} w-64`} />
          {species.length > 0 && !speciesId && (
            <div className="absolute z-[1000] mt-1 w-64 rounded-lg border bg-white shadow">
              {species.map((s) => <button key={s.id} onClick={() => { setSpeciesId(s.id); setSpeciesQ(s.commonName); }} className="block w-full px-3 py-2 text-left hover:bg-emerald-50">{s.commonName}</button>)}
            </div>
          )}
        </div>
        <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className={`${field} w-auto`}>
          {[10, 30, 50, 100, 200, 300].map((r) => <option key={r} value={r}>Trong {r} km</option>)}
        </select>
        <button onClick={locate} className="rounded-full border border-emerald-700 px-4 py-2 font-bold text-emerald-800">Gần tôi</button>
        {count !== undefined && <span className="text-stone-500">{count} nhà vườn/shop</span>}
      </div>
      <div ref={box} className="h-[70vh] min-h-[420px] w-full overflow-hidden rounded-xl border border-stone-200" />
      <p className="text-xs text-stone-500">Chỉ hiển thị Nhà vườn/Shop đã xác minh và đang có gói. Vị trí người bán cá nhân không hiển thị trên bản đồ.</p>
    </div>
  );
}
