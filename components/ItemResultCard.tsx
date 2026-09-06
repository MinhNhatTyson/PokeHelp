import { ItemDetail } from "@/lib/types";

export default function ItemResultCard({ item }: { item: ItemDetail }) {
  return (
    <div className="rounded-lg bg-[color:var(--shell)] p-5 text-[color:var(--foreground)]">
      <div className="flex items-center gap-4">
        {item.spriteUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.spriteUrl}
            alt={item.name}
            className="h-12 w-12 rounded-md bg-white/5 object-contain p-1"
          />
        )}
        <div>
          <h2 className="font-display text-2xl capitalize">{item.name.replace(/-/g, " ")}</h2>
          <span className="inline-block rounded-full bg-black/20 px-2.5 py-0.5 text-xs font-medium capitalize opacity-80">
            {item.category.replace(/-/g, " ")}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="opacity-50">Cost</p>
          <p>{item.cost > 0 ? `₽${item.cost.toLocaleString()}` : "Not sold"}</p>
        </div>
        {item.flingPower !== null && (
          <div>
            <p className="opacity-50">Fling power</p>
            <p>{item.flingPower}</p>
          </div>
        )}
        {item.flingEffect && (
          <div>
            <p className="opacity-50">Fling effect</p>
            <p className="capitalize">{item.flingEffect.replace(/-/g, " ")}</p>
          </div>
        )}
      </div>

      {item.shortEffect && (
        <div className="mt-5 text-sm">
          <p className="opacity-50">Effect</p>
          <p className="mt-1 opacity-90">{item.shortEffect}</p>
        </div>
      )}

      {item.flavorText && (
        <div className="mt-4 text-sm italic opacity-60">&quot;{item.flavorText}&quot;</div>
      )}

      {item.attributes.length > 0 && (
        <div className="mt-4 text-sm">
          <p className="opacity-50">Attributes</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.attributes.map((a) => (
              <span
                key={a}
                className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs capitalize"
              >
                {a.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}