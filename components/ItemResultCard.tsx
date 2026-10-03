import { ItemDetail } from "@/lib/types";

export default function ItemResultCard({ item }: { item: ItemDetail }) {
  const name = item.name.replace(/-/g, " ");
  return (
    <div className="pokecard" style={{ borderColor: "var(--accent-gold)" }}>
      <div className="effect-banner" style={{ background: "linear-gradient(90deg, #b45309, #ffc72c)", color: "#1f2124" }}>
        <span className="capitalize">{item.category.replace(/-/g, " ")}</span>
        <span>{item.cost > 0 ? `₽${item.cost.toLocaleString()}` : "Not sold"}</span>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(180deg, rgba(255,199,44,0.25), rgba(255,199,44,0.04))" }}
          >
            {item.spriteUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.spriteUrl} alt={name} className="h-14 w-14 object-contain [image-rendering:pixelated] drop-shadow-[0_6px_4px_rgba(0,0,0,0.3)]" />
            )}
          </div>
          <h2 className="font-heading text-2xl capitalize text-[color:var(--ink)]">{name}</h2>
        </div>

        {item.shortEffect && (
          <div className="mt-5 overflow-hidden rounded-lg border border-black/10">
            <div className="effect-banner effect-banner--not-very"><span>Effect</span></div>
            <p className="bg-black/5 p-3 text-sm leading-relaxed text-[color:var(--ink)]">{item.shortEffect}</p>
          </div>
        )}

        {(item.flingPower !== null || item.flingEffect) && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {item.flingPower !== null && (
              <div className="rounded-lg bg-black/5 p-3">
                <p className="text-xs uppercase text-[color:var(--ink)]/50">Fling power</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--ink)]">{item.flingPower}</p>
              </div>
            )}
            {item.flingEffect && (
              <div className="rounded-lg bg-black/5 p-3">
                <p className="text-xs uppercase text-[color:var(--ink)]/50">Fling effect</p>
                <p className="mt-0.5 font-medium capitalize text-[color:var(--ink)]">{item.flingEffect.replace(/-/g, " ")}</p>
              </div>
            )}
          </div>
        )}

        {item.attributes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {item.attributes.map((a) => (
              <span key={a} className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs capitalize text-[color:var(--ink)]">
                {a.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        )}

        {item.flavorText && (
          <p className="mt-4 border-t border-black/10 pt-3 text-sm italic text-[color:var(--ink)]/60">&quot;{item.flavorText}&quot;</p>
        )}
      </div>
    </div>
  );
}