"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeamStore } from "@/lib/store/teamStore";
import { useOpponentTeamStore } from "@/lib/store/opponentTeamStore";
import { fetchPokemonDetail, fetchPokemonNameList } from "@/lib/data/fetchAndCache";
import { getCommonSet } from "@/lib/data/commonSets";
import { useListNav } from "@/lib/hooks/useListNav";
import { NATURE_LABEL, NatureName, MAX_SP_PER_STAT, MAX_TOTAL_SP } from "@/lib/logic/statCalc";
import { PokemonNameEntry } from "@/lib/types";
import {
  MonConfig, StatKey, BoostKey, PresetKey,
  applyPreset, configFromTeamSlot, configFromOpponent, configFromDetail,
} from "@/lib/logic/damageCalc";
import TypeBadge from "@/components/TypeBadge";
import StageStepper from "@/components/StageStepper";

const SP_FIELDS: { key: StatKey; label: string }[] = [
  { key: "hp", label: "HP" }, { key: "atk", label: "Atk" }, { key: "def", label: "Def" },
  { key: "spa", label: "SpA" }, { key: "spd", label: "SpD" }, { key: "spe", label: "Spe" },
];
const BOOST_LABEL: Record<BoostKey, string> = { atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed" };
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "offense", label: "Max offense" }, { key: "balanced", label: "Balanced bulk" },
  { key: "physBulk", label: "Phys bulk" }, { key: "specBulk", label: "Spec bulk" }, { key: "none", label: "Clear" },
];

export default function DamageMonPanel({ role, config, onChange }: {
  role: "attacker" | "defender"; config: MonConfig; onChange: (c: MonConfig) => void;
}) {
  const teamSlots = useTeamStore((s) => s.slots);
  const oppSlots = useOpponentTeamStore((s) => s.slots);
  const [query, setQuery] = useState("");
  const [names, setNames] = useState<PokemonNameEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchPokemonNameList().then(setNames); }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? names.filter((p) => p.name.startsWith(q)).slice(0, 8) : [];
  }, [query, names]);

  async function pickByName(name: string) {
    setQuery(""); setShowDropdown(false); setLoading(true);
    const detail = await fetchPokemonDetail(name);
    setLoading(false);
    if (detail) onChange(configFromDetail(detail, role));
  }

  const nav = useListNav({
    items: matches,
    isOpen: showDropdown && !!query.trim(),
    onSelect: (p) => pickByName(p.name),
    onClose: () => setShowDropdown(false),
    onOpen: () => setShowDropdown(true),
  });

  const patch = (p: Partial<MonConfig>) => onChange({ ...config, ...p });
  const mon = config.detail;
  const megaForm = mon ? getCommonSet(mon.name)?.megaForm : undefined;
  const boostKeys: BoostKey[] = role === "attacker" ? ["atk", "spa"] : ["def", "spd"];
  const totalSp = Object.values(config.sp).reduce((a, b) => a + b, 0);

  const yourMons = teamSlots.filter((s) => s.pokemon);
  const scouted = oppSlots.filter((s) => s.pokemon);

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <p className="font-heading text-base text-[color:var(--ink)]">{role === "attacker" ? "Attacker" : "Defender"}</p>

      {(yourMons.length > 0 || scouted.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {yourMons.map((s) => (
            <button key={`y-${s.pokemon!.name}`} type="button" onClick={() => { const c = configFromTeamSlot(s); if (c) onChange(c); }}
              className="rounded-full bg-[color:var(--accent-gold)]/40 px-2.5 py-1 text-xs capitalize text-[color:var(--ink)] btn-tactile">
              {s.pokemon!.name}
            </button>
          ))}
          {scouted.map((s) => (
            <button key={`o-${s.pokemon!.name}`} type="button" onClick={() => { const c = configFromOpponent(s); if (c) onChange(c); }}
              className="rounded-full bg-black/10 px-2.5 py-1 text-xs capitalize text-[color:var(--ink)] btn-tactile">
              {s.pokemon!.name}
            </button>
          ))}
        </div>
      )}

      <div className="relative mt-2">
        <input
          {...nav.inputProps}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); nav.resetActive(); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Or search any Pokémon…"
          autoComplete="off"
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
        />
        {loading && <p className="mt-1 text-xs opacity-60">Loading…</p>}
        {showDropdown && matches.length > 0 && (
          <div role="listbox" className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-black/10 bg-white p-1 shadow-lg">
            {matches.map((p, i) => (
              <button key={p.name} type="button" onMouseDown={() => pickByName(p.name)} {...nav.optionProps(i)}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-sm capitalize text-[color:var(--ink)] ${nav.activeIndex === i ? "bg-black/10" : "hover:bg-black/5"}`}>
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!mon ? (
        <p className="mt-3 text-xs text-[color:var(--ink)]/50">Pick one of your mons, a scouted opponent, or search any Pokémon.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            {mon.spriteUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={mon.spriteUrl} alt="" className="h-12 w-12" />}
            <div>
              <p className="text-sm font-medium capitalize text-[color:var(--ink)]">{mon.name}</p>
              <div className="mt-0.5 flex gap-1">{mon.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
            </div>
          </div>

          {megaForm && (
            <label className="flex items-center gap-2 text-xs text-[color:var(--ink)]/70">
              <input type="checkbox" checked={config.useMega} onChange={(e) => patch({ useMega: e.target.checked })} />
              Mega Evolved ({megaForm.formShowdownName})
            </label>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Item</label>
              <input list="item-options" value={config.item?.replace(/-/g, " ") ?? ""}
                onChange={(e) => patch({ item: e.target.value.trim() ? e.target.value.trim().toLowerCase().replace(/\s+/g, "-") : null })}
                placeholder="Item…" autoComplete="off"
                className="mt-1 w-full rounded-md border border-black/10 px-2 py-2 text-sm capitalize text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]" />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Ability</label>
              <select value={config.ability ?? ""} disabled={config.useMega && !!megaForm}
                onChange={(e) => patch({ ability: e.target.value || null })}
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-sm capitalize text-[color:var(--ink)] outline-none disabled:opacity-50">
                <option value="">Default</option>
                {mon.abilities.map((a) => <option key={a.name} value={a.name}>{a.name.replace(/-/g, " ")}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Nature</label>
            <select value={config.nature ?? ""} onChange={(e) => patch({ nature: (e.target.value || null) as NatureName | null })}
              className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-[color:var(--ink)] outline-none">
              <option value="">Neutral</option>
              {Object.entries(NATURE_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Stat Points</label>
              <span className={`text-xs tabular-nums ${totalSp > MAX_TOTAL_SP ? "font-semibold text-red-600" : "text-[color:var(--ink)]/50"}`}>
                {totalSp}/{MAX_TOTAL_SP}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-6 gap-1">
              {SP_FIELDS.map((f) => (
                <label key={f.key} className="text-center text-[10px] uppercase text-[color:var(--ink)]/50">
                  {f.label}
                  <input type="number" min={0} max={MAX_SP_PER_STAT} value={config.sp[f.key]}
                    onChange={(e) => patch({ sp: { ...config.sp, [f.key]: Math.max(0, Math.min(MAX_SP_PER_STAT, Number(e.target.value) || 0)) } })}
                    className="mt-0.5 w-full rounded-md border border-black/10 px-1 py-1.5 text-center text-sm text-[color:var(--ink)] outline-none" />
                </label>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button key={p.key} type="button" onClick={() => onChange(applyPreset(config, p.key))}
                  className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] text-[color:var(--ink)] btn-tactile">{p.label}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 rounded-md bg-black/5 p-2.5">
            {boostKeys.map((k) => (
              <StageStepper key={k} label={`${BOOST_LABEL[k]} stage`} value={config.boosts[k]}
                onChange={(v) => patch({ boosts: { ...config.boosts, [k]: v } })} />
            ))}
            {role === "attacker" && (
              <label className="flex items-center gap-2 pt-1 text-xs text-[color:var(--ink)]/70">
                <input type="checkbox" checked={config.burned} onChange={(e) => patch({ burned: e.target.checked })} />
                Burned (halves physical damage)
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}