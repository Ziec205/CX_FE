"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { PhotoPicker, type UploadedPhoto } from "@/components/PhotoPicker";
import { SpeciesPicker, type PickedSpecies } from "@/components/SpeciesPicker";
import { Alert, Label, Section, btn, field } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { KIND_LABEL, REPEAT_UNIT, defaultFirstReminder, repeatText, toLocalInput, upcomingReminders } from "@/lib/garden";
import type { CareReminder, MyPlant, ReminderKind, ReminderRepeat } from "@/lib/types";

const REPEAT_LABEL = REPEAT_UNIT;

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";


export default function MyGardenPage() {
  return <Suspense><MyGarden /></Suspense>;
}

function MyGarden() {
  const focus = useSearchParams().get("cay");
  const [plants, setPlants] = useState<MyPlant[]>();
  const [error, setError] = useState<string>();
  const [needLogin, setNeedLogin] = useState(false);
  const [editing, setEditing] = useState<MyPlant | "new">();

  const load = useCallback(() => {
    api<MyPlant[]>("me/garden/plants").then(setPlants, (e) => {
      if ((e as ApiError).status === 401) setNeedLogin(true);
      else setError(errorText(e));
    });
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (focus && plants) document.getElementById(`plant-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus, plants]);

  if (needLogin)
    return <Alert kind="info">Vui lòng <Link href="/dang-nhap?next=/vuon-cua-toi" className="font-bold underline">đăng nhập</Link> để dùng Hồ sơ vườn.</Alert>;

  const upcoming = upcomingReminders(plants ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-extrabold text-emerald-900 sm:text-5xl">Hồ sơ vườn</h1>
          <p className="mt-1 text-stone-600">Lưu các cây bạn đang trồng và đặt lịch nhắc tưới, bón phân.</p>
        </div>
        <button onClick={() => setEditing("new")} className={btn.primary}>+ Thêm cây</button>
      </div>
      {error && <Alert>{error}</Alert>}

      <section id="lich-nhac" aria-labelledby="lich-nhac-title" className="scroll-mt-40 rounded-3xl bg-water-500 p-5 text-white sm:p-6">
        <h2 id="lich-nhac-title" className="text-2xl font-bold">Lịch nhắc sắp tới</h2>
        {plants && upcoming.length === 0 && (
          <p className="mt-2 text-water-50">
            {plants.length === 0 ? "Thêm một cây vào vườn, rồi bấm Đặt nhắc để hẹn giờ tưới." : "Chưa có lời nhắc nào. Bấm Đặt nhắc ở từng cây để hẹn giờ tưới, bón phân."}
          </p>
        )}
        {upcoming.length > 0 && (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white px-4 py-3 text-stone-900">
                <p className="font-display text-lg font-bold text-water-700">{when(r.nextAt)}</p>
                <p><b>{KIND_LABEL[r.kind]}</b> cho {r.plantName}</p>
                {r.note && <p className="text-sm text-stone-500">{r.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && <PlantForm plant={editing === "new" ? undefined : editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />}

      {plants?.length === 0 && !editing && (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 p-10 text-center text-stone-500">
          Vườn của bạn chưa có cây nào. Bấm <b>Thêm cây</b> để bắt đầu.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {plants?.map((p) => (
          <PlantCard key={p.id} plant={p} highlighted={p.id === focus} onEdit={() => setEditing(p)} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

function PlantForm({ plant, onClose, onSaved }: { plant?: MyPlant; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(plant?.name ?? "");
  const [species, setSpecies] = useState<PickedSpecies | undefined>(plant?.speciesId ? { id: plant.speciesId, name: plant.speciesName ?? plant.speciesId } : undefined);
  const [location, setLocation] = useState(plant?.location ?? "");
  const [acquiredAt, setAcquiredAt] = useState(plant?.acquiredAt?.slice(0, 10) ?? "");
  const [note, setNote] = useState(plant?.note ?? "");
  const [photos, setPhotos] = useState<UploadedPhoto[]>(plant?.photos.map((m) => ({ id: m.id, preview: m.urls.thumb })) ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    const json = {
      name, speciesId: species?.id ?? null, location: location || null, note: note || null,
      acquiredAt: acquiredAt ? new Date(acquiredAt).toISOString() : null, mediaIds: photos.map((p) => p.id),
    };
    try {
      await api(plant ? `me/garden/plants/${plant.id}` : "me/garden/plants", { method: plant ? "PUT" : "POST", json });
      onSaved();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }

  return (
    <Section title={plant ? `Sửa: ${plant.name}` : "Thêm cây vào vườn"} action={<button onClick={onClose} className="text-sm text-stone-500">Đóng</button>}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Label text="Tên gọi" required><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className={field} placeholder="Vd: Trầu bà góc phòng khách" /></Label>
        <Label text="Loài (không bắt buộc)"><SpeciesPicker value={species} onChange={setSpecies} /></Label>
        <Label text="Vị trí đặt"><input value={location} onChange={(e) => setLocation(e.target.value)} className={field} placeholder="Ban công, sân thượng…" /></Label>
        <Label text="Ngày bắt đầu trồng"><input type="date" value={acquiredAt} onChange={(e) => setAcquiredAt(e.target.value)} className={field} /></Label>
        <div className="sm:col-span-2"><Label text="Ghi chú"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} className={field} /></Label></div>
        <div className="sm:col-span-2"><Label text="Ảnh cây"><PhotoPicker value={photos} onChange={setPhotos} max={10} kind="PlantPhoto" /></Label></div>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="flex gap-2 sm:col-span-2">
          <button disabled={busy} className={btn.primary}>{busy ? "Đang lưu…" : "Lưu"}</button>
          <button type="button" onClick={onClose} className={btn.secondary}>Hủy</button>
        </div>
      </form>
    </Section>
  );
}

function PlantCard({ plant, highlighted, onEdit, onChanged }: { plant: MyPlant; highlighted: boolean; onEdit: () => void; onChanged: () => void }) {
  const [adding, setAdding] = useState<CareReminder | "new">();
  const [error, setError] = useState<string>();

  async function remove() {
    if (!confirm(`Xóa "${plant.name}" và các lời nhắc của cây?`)) return;
    try { await api(`me/garden/plants/${plant.id}`, { method: "DELETE" }); onChanged(); } catch (e) { setError(errorText(e)); }
  }
  async function toggle(r: CareReminder) {
    try {
      await api(`me/garden/plants/${plant.id}/reminders/${r.id}`, {
        method: "PUT",
        // Bật lại lời nhắc một lần đã qua thì dời sang lần kế tiếp hợp lệ do server tính; ở đây gửi lại mốc cũ.
        json: { kind: r.kind, at: r.anchorAt.endsWith("Z") ? r.anchorAt : r.anchorAt + "Z", repeat: r.repeat, interval: r.interval, note: r.note, enabled: !r.enabled },
      });
      onChanged();
    } catch (e) { setError(errorText(e)); }
  }
  async function delReminder(r: CareReminder) {
    try { await api(`me/garden/plants/${plant.id}/reminders/${r.id}`, { method: "DELETE" }); onChanged(); } catch (e) { setError(errorText(e)); }
  }

  const cover = plant.photos[0];
  return (
    <article id={`plant-${plant.id}`} className={`overflow-hidden rounded-2xl border bg-white ${highlighted ? "border-emerald-600 ring-2 ring-emerald-200" : "border-stone-200"}`}>
      <div className="flex gap-4 p-4">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.urls.card} alt="" className="h-28 w-28 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-3xl">🌿</div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-2xl leading-tight text-emerald-800">{plant.name}</h2>
          <p className="text-sm text-stone-600">
            {plant.speciesName && <Link href={`/tim-kiem?speciesId=${plant.speciesId}`} className="hover:underline">{plant.speciesName}</Link>}
            {plant.speciesName && plant.location && " · "}{plant.location}
          </p>
          {plant.acquiredAt && <p className="text-xs text-stone-500">Trồng từ {new Date(plant.acquiredAt).toLocaleDateString("vi-VN")}</p>}
          {plant.note && <p className="line-clamp-2 text-sm text-stone-700">{plant.note}</p>}
          <div className="flex gap-3 pt-1 text-sm">
            <button onClick={onEdit} className="text-emerald-700 hover:underline">Sửa</button>
            <button onClick={remove} className="text-red-700 hover:underline">Xóa</button>
          </div>
        </div>
      </div>
      {plant.photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          {plant.photos.slice(1).map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={m.id} src={m.urls.thumb} alt="" className="h-14 w-14 rounded-lg object-cover" />
          ))}
        </div>
      )}
      <div className="border-t border-water-100 bg-water-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-sans text-base font-bold tracking-normal text-water-700">Lời nhắc chăm cây</h3>
          {!adding && <button onClick={() => setAdding("new")} className={btn.small}>+ Đặt nhắc</button>}
        </div>
        {error && <Alert>{error}</Alert>}
        {plant.reminders.length === 0 && !adding && <p className="text-sm text-stone-500">Chưa có lời nhắc.</p>}
        <ul className="space-y-2">
          {plant.reminders.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm ${r.enabled ? "" : "opacity-60"}`}>
              <div>
                <b>{KIND_LABEL[r.kind]}</b> · {repeatText(r)}
                <div className="text-xs text-stone-500">{r.enabled && r.nextAt ? `Lần tới: ${when(r.nextAt)}` : "Đang tắt"}{r.note && ` · ${r.note}`}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAdding(r)} className="text-emerald-700 hover:underline">Sửa</button>
                {(r.enabled || r.repeat !== "None") && <button onClick={() => toggle(r)} className="text-stone-600 hover:underline">{r.enabled ? "Tắt" : "Bật"}</button>}
                <button onClick={() => delReminder(r)} className="text-red-700 hover:underline">Xóa</button>
              </div>
            </li>
          ))}
        </ul>
        {adding && <ReminderForm plantId={plant.id} reminder={adding === "new" ? undefined : adding} onDone={() => { setAdding(undefined); onChanged(); }} onCancel={() => setAdding(undefined)} />}
      </div>
    </article>
  );
}

function ReminderForm({ plantId, reminder, onDone, onCancel }: { plantId: string; reminder?: CareReminder; onDone: () => void; onCancel: () => void }) {
  const initial = reminder ? new Date(reminder.nextAt ?? (reminder.anchorAt.endsWith("Z") ? reminder.anchorAt : reminder.anchorAt + "Z")) : defaultFirstReminder();
  const [kind, setKind] = useState<ReminderKind>(reminder?.kind ?? "Watering");
  const [at, setAt] = useState(toLocalInput(initial));
  const [repeat, setRepeat] = useState<ReminderRepeat>(reminder?.repeat ?? "Daily");
  const [every, setEvery] = useState(reminder?.interval ?? 1);
  const [note, setNote] = useState(reminder?.note ?? "");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    try {
      await api(reminder ? `me/garden/plants/${plantId}/reminders/${reminder.id}` : `me/garden/plants/${plantId}/reminders`, {
        method: reminder ? "PUT" : "POST",
        json: { kind, at: new Date(at).toISOString(), repeat, interval: repeat === "None" ? 1 : every, note: note || null, enabled: true },
      });
      onDone();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="mt-3 grid gap-3 rounded-xl border border-emerald-200 bg-white p-3 sm:grid-cols-2">
      <Label text="Việc cần làm">
        <select value={kind} onChange={(e) => setKind(e.target.value as ReminderKind)} className={field}>
          {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Label>
      <Label text="Giờ – ngày – tháng – năm" required hint="Lần nhắc đầu tiên">
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} required className={field} />
      </Label>
      <Label text="Lặp lại">
        <select value={repeat} onChange={(e) => setRepeat(e.target.value as ReminderRepeat)} className={field}>
          <option value="None">Không lặp</option>
          <option value="Daily">Hằng ngày</option>
          <option value="Weekly">Hằng tuần</option>
          <option value="Monthly">Hằng tháng</option>
          <option value="Yearly">Hằng năm</option>
        </select>
      </Label>
      {repeat !== "None" ? (
        <Label text={`Cứ mỗi … ${REPEAT_LABEL[repeat]}`}>
          <input type="number" min={1} max={365} value={every} onChange={(e) => setEvery(Number(e.target.value) || 1)} className={field} />
        </Label>
      ) : <div />}
      <div className="sm:col-span-2"><Label text="Ghi chú"><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={field} placeholder="Vd: tưới 200ml, tránh ướt lá" /></Label></div>
      {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={busy} className={btn.primary}>{busy ? "Đang lưu…" : "Lưu lời nhắc"}</button>
        <button type="button" onClick={onCancel} className={btn.secondary}>Hủy</button>
      </div>
    </form>
  );
}
