import { PokemonTypeName } from "@/lib/types";
import { TYPE_COLOR, TYPE_LABEL, TYPE_TEXT_ON_COLOR } from "@/lib/typeMeta";

export default function TypeBadge({
  type,
  size = "md",
}: {
  type: PokemonTypeName;
  size?: "sm" | "md" | "lg";
}) {
  const textIsLight = TYPE_TEXT_ON_COLOR[type] === "light";
  const sizeClasses =
    size === "lg"
      ? "px-4 py-1.5 text-base"
      : size === "sm"
      ? "px-2.5 py-0.5 text-xs"
      : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium tracking-normal ${sizeClasses} ${
        textIsLight ? "text-white" : "text-black/80"
      }`}
      style={{ backgroundColor: TYPE_COLOR[type] }}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}