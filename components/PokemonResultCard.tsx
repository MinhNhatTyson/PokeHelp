import { PokemonDetail } from "@/lib/types";
import { getDualAttackProfile, getDualDefenseProfile } from "@/lib/logic/effectiveness";
import TypeBadge from "@/components/TypeBadge";

const STAT_LABEL: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const MAX_STAT = 255; // PokeAPI base stat ceiling, used only for bar scaling

const DEFENSE_GROUPS = [
  { key: "quad", label: "4× damage from" },
  { key: "double", label: "2× damage from" },
  { key: "half", label: "½× damage from" },
  { key: "quarter", label: "¼× damage from" },
  { key: "immune", label: "No damage from" },
] as const;

export default function PokemonResultCard({
  pokemon,
  onSelectForm,
}: {
  pokemon: PokemonDetail;
  onSelectForm: (name: string) => void;
}) {
  const defense = getDualDefenseProfile(pokemon.types[0], pokemon.types[1]);
  const offense = getDualAttackProfile(pokemon.types[0], pokemon.types[1]);
  const image = pokemon.artworkUrl ?? pokemon.spriteUrl;

  return (
    <div className="rounded-lg bg-[color:var(--shell)] p-5 text-[color:var(--foreground)]">
      <div className="flex flex-wrap items-center gap-4">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={pokemon.name} className="h-24 w-24 object-contain" />
        )}
        <div>
          <p className="text-xs uppercase opacity-50">#{String(pokemon.dexNumber).padStart(4, "0")}</p>
          <h2 className="font-display text-2xl capitalize">{pokemon.name}</h2>
          {pokemon.genus && <p className="text-sm opacity-70">{pokemon.genus}</p>}
          <div className="mt-1.5 flex gap-1.5">
            {pokemon.types.map((t) => (
              <TypeBadge key={t} type={t} size="sm" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="opacity-50">Height</p>
          <p>{pokemon.heightM} m</p>
        </div>
        <div>
          <p className="opacity-50">Weight</p>
          <p>{pokemon.weightKg} kg</p>
        </div>
        <div className="mt-3 text-sm">
          <p className="opacity-50">Abilities</p>
          <div className="mt-1 space-y-1.5">
            {pokemon.abilities.map((a) => (
              <div key={a.name}>
                <span className="capitalize font-medium">
                  {a.name.replace(/-/g, " ")}
                  {a.isHidden && <span className="ml-1 text-xs opacity-50">(hidden)</span>}
                </span>
                {a.description && (
                  <p className="text-xs opacity-70">{a.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {pokemon.eggGroups.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="opacity-50">Egg groups</p>
          <p className="capitalize">{pokemon.eggGroups.join(", ")}</p>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-display text-base">Base stats</h3>
        <div className="mt-2 space-y-1.5">
          {pokemon.stats.map((s) => (
            <div key={s.name} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 opacity-70">{STAT_LABEL[s.name] ?? s.name}</span>
              <div className="h-2 flex-1 rounded-full bg-black/20">
                <div
                  className="h-2 rounded-full bg-[color:var(--accent-gold)]"
                  style={{ width: `${Math.min(100, (s.baseStat / MAX_STAT) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right">{s.baseStat}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-display text-base">Type defenses</h3>
        <div className="mt-2 space-y-2">
          {DEFENSE_GROUPS.map(({ key, label }) => {
            const types = defense[key];
            if (types.length === 0) return null;
            return (
              <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-32 shrink-0 opacity-70">{label}</span>
                <div className="flex flex-wrap gap-1">
                  {types.map((t) => (
                    <TypeBadge key={t} type={t} size="sm" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-display text-base">Offensive coverage</h3>
        <p className="text-xs opacity-50">Best-case effectiveness using either of this Pokémon&apos;s types</p>
        <div className="mt-2 space-y-2">
          {[
            { key: "superEffectiveAgainst", label: "Super effective vs" },
            { key: "notVeryEffectiveAgainst", label: "Not very effective vs" },
            { key: "noEffectAgainst", label: "No effect vs" },
          ].map(({ key, label }) => {
            const types = offense[key as keyof typeof offense];
            if (types.length === 0) return null;
            return (
              <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-40 shrink-0 opacity-70">{label}</span>
                <div className="flex flex-wrap gap-1">
                  {types.map((t) => (
                    <TypeBadge key={t} type={t} size="sm" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pokemon.evolutionChain.length > 1 && (
        <div className="mt-6">
          <h3 className="font-display text-base">Evolution chain</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm capitalize">
            {pokemon.evolutionChain.map((stage, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="opacity-40">→</span>}
                {stage.names.map((name, j) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onSelectForm(name)}
                    className={`rounded-full px-2.5 py-1 hover:bg-black/10 ${
                      name === pokemon.name ? "bg-black/10 font-medium" : ""
                    }`}
                  >
                    {j > 0 && <span className="mr-1 opacity-40">/</span>}
                    {name}
                  </button>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TODO: forms are links-only per your request — revisit as tabs once the feature's settled */}
      {pokemon.forms.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-base">Other forms</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {pokemon.forms.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => onSelectForm(f.name)}
                className="rounded-full bg-black/10 px-3 py-1 capitalize hover:bg-black/20"
              >
                {f.name.replace(/-/g, " ")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}