import Link from "next/link";
import type { Article } from "@/lib/types";

export function PlantCard({ a }: { a: Article }) {
  return (
    <Link href={`/kham-pha/${a.slug}`} className="cx-plant-card group w-40 shrink-0 snap-start sm:w-auto">
      <div className="h-32 overflow-hidden bg-emerald-100 sm:h-44">
        {a.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.cover.urls.card} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        )}
      </div>
      <div className="p-2.5">
        <h3 className="truncate font-sans text-sm font-bold text-stone-900">{a.title}</h3>
        {a.summary && <p className="line-clamp-2 text-xs leading-snug text-stone-600">{a.summary}</p>}
      </div>
    </Link>
  );
}

export function CardRow({ items }: { items: Article[] }) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
      {items.map((a) => <PlantCard key={a.id} a={a} />)}
    </div>
  );
}
