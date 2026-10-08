"use client";

import { useEffect, useMemo, useState } from "react";
import { useBattleSessionStore, scoutedOpponentLoadout } from "@/lib/store/battleSessionStore";
import { useOpponentTeamStore } from "@/lib/store/opponentTeamStore";
import { fetchCompetitiveItemNameList } from "@/lib/data/fetchAndCache";
import { getCommonSet } from "@/lib/data/commonSets";
import { ItemNameEntry } from "@/lib/types";

const pretty = (s: string) => s.replace(/-/g, " ");
const toSlug = (v: string) => v.trim().toLowerCase().replace(/\s+/g, "-");

function Chip({ kind }: { kind: "confirmed" | "guess" | "none" }) {
  const style =
    kind === "guess" ? "bg-black/10 text-[color:var(--ink)]/60"
    : kind === "none" ? "bg-slate-600 text-white"
    : "bg-emerald-600 text-white";
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none ${style}`}>
      {kind === "guess" ? "Guess" : kind === "none" ? "No item" : "Confirmed"}
    </span>
  );
}

function IntelRow({ name, onField, fainted, itemNames }: {
  name: string; onField: boolean; fainted: boolean; itemNames: Set<string>;
}) {
  const detail = useOpponentTeamStore((s) => s.slots.find((x) => x.pokemon?.name === name)?.pokemon ?? null);
  const reveal = useBattleSessionStore((s) => s.opponentReveals[name]);
  const megaOn = useBattleSessionStore((s) => s.megaUsed.opponent === name);
  const revealItem = useBattleSessionStore((s) => s.revealItem);
  const revealAbility = useBattleSessionStore((s) => s.revealAbility);
  const [draft, setDraft] = useState<string | null>(null); // null = not typing, show the confirmed value
  const [badItem, setBadItem] = useState(false);

  if (!detail) return null;

  const scouted = scoutedOpponentLoadout(name);
  const megaForm = megaOn ? getCommonSet(name)?.megaForm : undefined;
  const itemRevealed = !!reveal && "item" in reveal;
  const revealedItem = reveal?.item;
  const itemText = draft ?? (typeof revealedItem === "string" ? pretty(revealedItem) : "");

  function commitItem() {
    if (draft === null) return;
    const slug = toSlug(draft);
    setDraft(null);
    if (!slug) { revealItem(name, undefined); setBadItem(false); return; }
    if (itemNames.size > 0 && !itemNames.has(slug)) { setBadItem(true); return; }
    setBadItem(false);
    revealItem(name, slug);
  }

  return (
    <li className="rounded-md bg-black/5 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {detail.spriteUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={detail.spriteUrl} alt="" className="h-8 w-8 object-contain" />
        )}
        <span className={`text-sm font-medium capitalize text-[color:var(--ink)] ${fainted ? "line-through opacity-60" : ""}`}>{name}</span>
        {onField && !fainted && <span className="rounded-full bg-[color:var(--shell-accent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-white">On field</span>}
        {fainted && <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--ink)]">Fainted</span>}
        {megaOn && <span className="rounded-full bg-[color:var(--accent-gold)] px-2 py-0.5 text-[10px] font-semibold uppercase text-black">Mega</span>}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center justify-between gap-1">
            <label htmlFor={`intel-item-${name}`} className="text-[10px] font-medium uppercase text-[color:var(--ink)]/40">Item</label>
            <Chip kind={itemRevealed ? (revealedItem === null ? "none" : "confirmed") : "guess"} />
          </div>
          <input
            id={`intel-item-${name}`}
            list="intel-item-options"
            value={itemText}
            onChange={(e) => { setDraft(e.target.value); setBadItem(false); }}
            onBlur={commitItem}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            placeholder={`Guess: ${scouted.item ? pretty(scouted.item) : "unknown"}`}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-sm capitalize text-[color:var(--ink)] outline-none placeholder:normal-case placeholder:text-black/30 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          />
          {badItem && <p className="mt-1 text-[10px] text-red-600">Not in the item list. Pick one of the suggestions.</p>}
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => { setDraft(null); revealItem(name, null); }} className="text-[10px] text-[color:var(--ink)]/60 hover:underline">
              No item / knocked off
            </button>
            {itemRevealed && (
              <button type="button" onClick={() => { setDraft(null); revealItem(name, undefined); }} className="text-[10px] text-[color:var(--ink)]/60 hover:underline">
                Reset to guess
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-1">
            <label htmlFor={`intel-ability-${name}`} className="text-[10px] font-medium uppercase text-[color:var(--ink)]/40">Ability</label>
            <Chip kind={megaForm || reveal?.ability ? "confirmed" : "guess"} />
          </div>
          {megaForm ? (
            <div className="mt-1 rounded-md border border-black/10 bg-black/5 px-2 py-2 text-sm capitalize text-[color:var(--ink)]">
              {pretty(megaForm.formAbility)}
              <p className="text-[10px] normal-case text-[color:var(--ink)]/50">Locked: it Mega Evolved.</p>
            </div>
          ) : (
            <select
              id={`intel-ability-${name}`}
              value={reveal?.ability ?? ""}
              onChange={(e) => revealAbility(name, e.target.value || undefined)}
              className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-sm capitalize text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
            >
              <option value="">Guess: {scouted.ability ? pretty(scouted.ability) : "unknown"}</option>
              {detail.abilities.map((a) => (
                <option key={a.name} value={a.name}>{pretty(a.name)}{a.isHidden ? " (hidden)" : ""}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </li>
  );
}

export default function OpponentLoadoutPanel() {
  const slots = useOpponentTeamStore((s) => s.slots);
  const activeBattlers = useBattleSessionStore((s) => s.activeBattlers);
  const faintedOpp = useBattleSessionStore((s) => s.fainted.opponent);
  const reveals = useBattleSessionStore((s) => s.opponentReveals);
  const [itemList, setItemList] = useState<ItemNameEntry[]>([]);

  useEffect(() => { fetchCompetitiveItemNameList().then(setItemList); }, []);
  const itemNames = useMemo(() => new Set(itemList.map((i) => i.name)), [itemList]);

  const names = slots.filter((s) => s.pokemon).map((s) => s.pokemon!.name);
  if (names.length === 0) return null;

  const onField = (n: string) => activeBattlers.opponent.includes(n);
  const ordered = [...names].sort((a, b) => Number(onField(b)) - Number(onField(a)));
  const confirmed = names.reduce((sum, n) => sum + (reveals[n] && "item" in reveals[n] ? 1 : 0) + (reveals[n]?.ability ? 1 : 0), 0);

  return (
    <details className="group rounded-lg border border-black/10 bg-white">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
        <span className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Opponent intel</span>
        <span className="flex items-center gap-2">
          <span className={`text-xs tabular-nums ${confirmed > 0 ? "text-emerald-700" : "text-[color:var(--ink)]/60"}`}>
            {confirmed} confirmed
          </span>
          <span aria-hidden="true" className="text-sm opacity-50 transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>

      <div className="border-t border-black/10 p-3">
        <datalist id="intel-item-options">
          {itemList.map((i) => <option key={i.name} value={pretty(i.name)} />)}
        </datalist>
        <p className="text-xs text-[color:var(--ink)]/60">
          Everything starts as a guess from common sets. Record what you actually see during the battle: a held item, an ability, or no item
          after a Knock Off. Confirmed info is used for end-of-turn effects, the speed order, the damage preview and the advice.
          It only lasts for this battle.
        </p>
        <ul className="mt-2 space-y-2">
          {ordered.map((n) => (
            <IntelRow key={n} name={n} onField={onField(n)} fainted={faintedOpp.includes(n)} itemNames={itemNames} />
          ))}
        </ul>
      </div>
    </details>
  );
}