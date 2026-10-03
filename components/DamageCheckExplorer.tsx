"use client";

import { useEffect, useState } from "react";
import { fetchCompetitiveItemNameList, fetchMoveNameList } from "@/lib/data/fetchAndCache";
import { ItemNameEntry, MoveNameEntry } from "@/lib/types";
import { MonConfig, FieldSetup, DEFAULT_FIELD, blankConfig, configToSetup, runDamageCalc } from "@/lib/logic/damageCalc";
import DamageMonPanel from "@/components/DamageMonPanel";
import BackToOptimizer from "@/components/BackToOptimizer";
import { useBackdropStore } from "@/lib/store/backdropStore";

const WEATHERS = ["", "Sun", "Rain", "Sand", "Snow"] as const;
const TERRAINS = ["", "Electric", "Grassy", "Misty", "Psychic"] as const;
const TOGGLES: { key: "crit" | "helpingHand" | "reflect" | "lightScreen" | "auroraVeil"; label: string }[] = [
  { key: "crit", label: "Critical hit" }, { key: "helpingHand", label: "Helping Hand" },
  { key: "reflect", label: "Reflect" }, { key: "lightScreen", label: "Light Screen" }, { key: "auroraVeil", label: "Aurora Veil" },
];

export default function DamageCheckExplorer() {
  const [attacker, setAttacker] = useState<MonConfig>(blankConfig());
  const [defender, setDefender] = useState<MonConfig>(blankConfig());
  const [moveText, setMoveText] = useState("");
  const [field, setField] = useState<FieldSetup>(DEFAULT_FIELD);
  const [moveNames, setMoveNames] = useState<MoveNameEntry[]>([]);
  const [itemNames, setItemNames] = useState<ItemNameEntry[]>([]);

  useEffect(() => {
    fetchMoveNameList().then(setMoveNames);
    fetchCompetitiveItemNameList().then(setItemNames);
  }, []);

  function swap() { setAttacker(defender); setDefender(attacker); setMoveText(""); }

  const atkSetup = configToSetup(attacker);
  const defSetup = configToSetup(defender);
  const outcome = atkSetup && defSetup && moveText.trim() ? runDamageCalc(atkSetup, defSetup, moveText, field) : null;
  const damageSignal = (() => {
    if (!outcome || !outcome.ok) return null;
    if (outcome.kind === "noEffect") return { kind: "immune" as const, key: "immune" };
    return { kind: outcome.maxPct >= 100 ? ("ko" as const) : ("hit" as const), key: `${outcome.minPct}-${outcome.maxPct}` };
  })();
  const damageKind = damageSignal?.kind ?? null;
  const damageKey = damageSignal?.key ?? null;
  const setDamageSignal = useBackdropStore((s) => s.setDamage);
  useEffect(() => {
    setDamageSignal(damageKind && damageKey ? { kind: damageKind, key: `${damageKind}-${damageKey}` } : null);
  }, [damageKind, damageKey, setDamageSignal]);
  useEffect(() => () => setDamageSignal(null), [setDamageSignal]);

  return (
    <div className="w-full max-w-5xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />
      <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
        <BackToOptimizer />
        <h1 className="font-logo text-2xl sm:text-3xl text-[color:var(--ink)]">Damage check</h1>
        <p className="mt-1 text-sm text-[color:var(--ink)]/70">
          Pick an attacker, a defender and a move. Add stat stages, weather and screens to match the situation on the field.
        </p>

        <datalist id="item-options">{itemNames.map((i) => <option key={i.name} value={i.name.replace(/-/g, " ")} />)}</datalist>
        <datalist id="move-options">{moveNames.map((m) => <option key={m.name} value={m.name.replace(/-/g, " ")} />)}</datalist>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <DamageMonPanel role="attacker" config={attacker} onChange={setAttacker} />
          </div>
          <div className="flex shrink-0 items-center justify-center lg:flex-col lg:self-center">
            <button type="button" onClick={swap} aria-label="Swap attacker and defender"
              className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-[color:var(--shell)] text-[color:var(--screen)] btn-tactile">
              <span className="font-heading text-sm leading-none">VS</span>
              <span className="text-[10px] leading-none opacity-70">⇄ swap</span>
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <DamageMonPanel role="defender" config={defender} onChange={setDefender} />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-black/10 bg-white p-4">
          <label htmlFor="damage-move" className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Move</label>
          {attacker.knownMoves.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {attacker.knownMoves.map((m) => (
                <button key={m} type="button" onClick={() => setMoveText(m.replace(/-/g, " "))}
                  className="rounded-full bg-black/10 px-2.5 py-1 text-xs capitalize text-[color:var(--ink)] btn-tactile">{m.replace(/-/g, " ")}</button>
              ))}
            </div>
          )}
          <input id="damage-move" list="move-options" value={moveText} onChange={(e) => setMoveText(e.target.value)}
            placeholder="Type a move name…" autoComplete="off"
            className="mt-2 w-full rounded-md border border-black/10 px-3 py-2 text-sm capitalize text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]" />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Weather</label>
              <select value={field.weather} onChange={(e) => setField({ ...field, weather: e.target.value as FieldSetup["weather"] })}
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-[color:var(--ink)]">
                {WEATHERS.map((w) => <option key={w} value={w}>{w || "None"}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Terrain</label>
              <select value={field.terrain} onChange={(e) => setField({ ...field, terrain: e.target.value as FieldSetup["terrain"] })}
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-[color:var(--ink)]">
                {TERRAINS.map((t) => <option key={t} value={t}>{t || "None"}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TOGGLES.map((t) => (
              <button key={t.key} type="button" aria-pressed={field[t.key]} onClick={() => setField({ ...field, [t.key]: !field[t.key] })}
                className={`rounded-full px-3 py-1 text-xs font-medium btn-tactile ${field[t.key] ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {outcome && (
        <div className="mt-4 rounded-lg border border-[color:var(--accent-gold)]/60 bg-black/5 p-4">
            {!outcome.ok ? (
            <p className="text-sm text-red-600">{outcome.error}</p>
            ) : (
            <>
                {outcome.kind === "noEffect" ? (
                <p className="font-heading text-xl text-[color:var(--ink)]">{outcome.message}</p>
                ) : (
                <>
                    <p className="font-heading text-2xl text-[color:var(--ink)]">{outcome.minPct}% – {outcome.maxPct}%</p>
                    <p className="text-sm font-medium text-[color:var(--shell-accent)]">{outcome.koText || "No KO"}</p>
                    <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-black/15">
                    <div className="absolute inset-y-0 left-0 bg-[color:var(--accent-gold)]/60" style={{ width: `${Math.min(100, outcome.maxPct)}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-[color:var(--shell-accent)]" style={{ width: `${Math.min(100, outcome.minPct)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-[color:var(--ink)]/60">{outcome.minDmg}–{outcome.maxDmg} of {outcome.defenderHp} HP</p>
                    <p className="mt-2 text-xs text-[color:var(--ink)]/70">{outcome.description}</p>
                </>
                )}
                {outcome.warnings.map((w, i) => (
                <p key={i} className="mt-2 rounded-md bg-[color:var(--accent-gold)]/30 px-3 py-1.5 text-xs text-[color:var(--ink)]">{w}</p>
                ))}
            </>
            )}
        </div>
        )}
        <p className="mt-3 text-[11px] text-[color:var(--ink)]/40">
          Uses the Gen 9 damage formula at Lv50 with 31 IVs. Champions-specific changes the calculator doesn&apos;t know about won&apos;t show up.
        </p>
      </div>
    </div>
  );
}