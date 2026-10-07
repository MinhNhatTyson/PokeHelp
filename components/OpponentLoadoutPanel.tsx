"use client";

import { useEffect, useState } from "react";
import { useOpponentTeamStore } from "@/lib/store/opponentTeamStore";
import { fetchCompetitiveItemNameList, fetchPokemonDetail } from "@/lib/data/fetchAndCache";
import { getCommonSet, synthesizeMegaDetail } from "@/lib/data/commonSets";
import { ItemNameEntry } from "@/lib/types";

const toSlug = (v: string) => v.toLowerCase().replace(/\s+/g, "-").replace(/^-+/, "");

export default function OpponentLoadoutPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const slots = useOpponentTeamStore((s) => s.slots);
  const setSlotItem = useOpponentTeamStore((s) => s.setSlotItem);
  const setSlotAbility = useOpponentTeamStore((s) => s.setSlotAbility);
  const setSlotMegaFormDetail = useOpponentTeamStore((s) => s.setSlotMegaFormDetail);
  const [itemNames, setItemNames] = useState<ItemNameEntry[]>([]);

  useEffect(() => { fetchCompetitiveItemNameList().then(setItemNames); }, []);

  async function reconcileMega(index: number) {
    const slot = useOpponentTeamStore.getState().slots[index];
    const mon = slot.pokemon;
    const cs = mon ? getCommonSet(mon.name) : null;
    if (!mon || !cs?.megaForm) return;
    const isStone = slot.itemName === cs.topItem.toLowerCase().replace(/\s+/g, "-");
    if (isStone === !!slot.megaFormDetail) return; // already consistent, don't touch the ability
    if (isStone) {
      const detail = (await fetchPokemonDetail(cs.megaForm.formSpecies)) ?? synthesizeMegaDetail(mon, cs.megaForm);
      setSlotMegaFormDetail(index, detail);
      setSlotAbility(index, cs.megaForm.formAbility);
    } else {
      setSlotMegaFormDetail(index, null); // no stone, so no Mega
      setSlotAbility(index, mon.abilities.some((a) => a.name === cs.likelyAbility) ? cs.likelyAbility : null);
    }
  }

  const rows = slots.map((slot, index) => ({ slot, index })).filter((r) => r.slot.pokemon);
  if (rows.length === 0) return null;
  const itemsSet = rows.filter((r) => r.slot.itemName).length;

  return (
    <details open={defaultOpen} className="group rounded-lg border border-black/10 bg-white">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
        <span className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Opponent items &amp; abilities</span>
        <span className="flex items-center gap-2">
          <span className={`text-xs tabular-nums ${itemsSet === rows.length ? "text-emerald-700" : "text-[color:var(--ink)]/60"}`}>
            {itemsSet}/{rows.length} items listed
          </span>
          <span aria-hidden="true" className="text-sm opacity-50 transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>

      <div className="border-t border-black/10 p-3">
        <datalist id="opp-item-options">
          {itemNames.map((i) => <option key={i.name} value={i.name.replace(/-/g, " ")} />)}
        </datalist>
        <p className="text-xs text-[color:var(--ink)]/60">
          Items and abilities were pre-filled from common sets, so they&apos;re guesses. Correct any that differ as they&apos;re revealed.
          Leftovers, Black Sludge and Sitrus-type berries heal automatically, and abilities like Poison Heal and Magic Guard are applied.
          A changed item takes effect at the next end of turn, not retroactively.
        </p>
        <ul className="mt-2 space-y-2">
          {rows.map(({ slot, index }) => {
            const mon = slot.pokemon!;
            const mega = getCommonSet(mon.name)?.megaForm;
            const megaLocked = !!slot.megaFormDetail && !!mega;
            const sprite = mon.spriteUrl;
            return (
              <li key={index} className="rounded-md bg-black/5 p-2.5">
                <div className="flex items-center gap-2">
                  {sprite && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sprite} alt="" className="h-8 w-8 object-contain" />
                  )}
                  <span className="text-sm font-medium capitalize text-[color:var(--ink)]">{mon.name}</span>
                  {megaLocked && (
                    <span className="rounded-full bg-[color:var(--accent-gold)] px-2 py-0.5 text-[10px] font-semibold uppercase text-black">Mega</span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`opp-item-${index}`} className="text-[10px] font-medium uppercase text-[color:var(--ink)]/40">Item</label>
                    <input
                      id={`opp-item-${index}`}
                      list="opp-item-options"
                      value={slot.itemName?.replace(/-/g, " ") ?? ""}                      
                      onChange={(e) => setSlotItem(index, toSlug(e.target.value) || null)}
                      onBlur={(e) => {
                        setSlotItem(index, toSlug(e.target.value).replace(/-+$/, "") || null);
                        void reconcileMega(index);
                      }}
                      placeholder="Unknown"
                      autoComplete="off"
                      className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-sm capitalize text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
                    />
                  </div>
                  <div>
                    <label htmlFor={`opp-ability-${index}`} className="text-[10px] font-medium uppercase text-[color:var(--ink)]/40">Ability</label>
                    {megaLocked && mega ? (
                      <div className="mt-1 rounded-md border border-black/10 bg-black/5 px-2 py-2 text-sm capitalize text-[color:var(--ink)]">
                        {mega.formAbility.replace(/-/g, " ")}
                      </div>
                    ) : (
                      <select
                        id={`opp-ability-${index}`}
                        value={slot.abilityName ?? ""}
                        onChange={(e) => setSlotAbility(index, e.target.value || null)}
                        className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-sm capitalize text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
                      >
                        <option value="">Unknown</option>
                        {mon.abilities.map((a) => (
                          <option key={a.name} value={a.name}>
                            {a.name.replace(/-/g, " ")}{a.isHidden ? " (hidden)" : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}