import { PokemonTypeName } from "@/lib/types";
import { TYPE_COLOR, TYPE_LABEL } from "@/lib/typeMeta";

export default function TypePip({
  type,
  multiplier,
}: {
  type: PokemonTypeName;
  multiplier?: string; // e.g. "×2" — omit to just show the type name
}) {
  return (
    <span
      title={TYPE_LABEL[type]}
      className="inline-flex items-center gap-1 rounded-full bg-black/5 py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-[color:var(--ink)]"
    >
      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLOR[type] }} />
      {multiplier ?? TYPE_LABEL[type]}
    </span>
  );
}