import { PokemonTypeName } from "@/lib/types";
import { TYPE_COLOR, TYPE_LABEL, TYPE_TEXT_ON_COLOR } from "@/lib/typeMeta";
import TypeIcon from "@/components/TypeIcon";

export default function TypeChip({
  type,
  multiplier,
  onClick,
}: {
  type: PokemonTypeName;
  multiplier?: string;
  onClick?: (type: PokemonTypeName) => void;
}) {
  const light = TYPE_TEXT_ON_COLOR[type] === "light";
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick ? () => onClick(type) : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-semibold shadow-sm ${
        light ? "text-white" : "text-black/85"
      } ${onClick ? "cursor-pointer transition-transform hover:scale-105" : ""}`}
      style={{ backgroundColor: TYPE_COLOR[type] }}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/15">
        <TypeIcon type={type} className="h-3.5 w-3.5" />
      </span>
      <span className="capitalize">{TYPE_LABEL[type]}</span>
      {multiplier && <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-xs">{multiplier}</span>}
    </Tag>
  );
}