"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useTeamStore, TEAM_SIZE } from "@/lib/store/teamStore";
import { fetchPokemonDetail, fetchPokemonNameList, fetchCompetitiveItemNameList } from "@/lib/data/fetchAndCache";
import { parseShowdownTeam } from "@/lib/logic/showdownImport";

async function resolveSpecies(slug: string) {
  const direct = await fetchPokemonDetail(slug);
  if (direct) return direct;
  // e.g. "ogerpon-wellspring" -> "ogerpon-wellspring-mask"
  const list = await fetchPokemonNameList();
  const match = list.find((p) => p.name.startsWith(`${slug}-`));
  return match ? fetchPokemonDetail(match.name) : null;
}

export default function ImportTeamModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [report, setReport] = useState<{ imported: string[]; warnings: string[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  async function handleImport() {
    const sets = parseShowdownTeam(text);
    if (sets.length === 0) {
      setReport({ imported: [], warnings: ["Couldn't find any Pokémon in that text."] });
      return;
    }
    setStatus("loading");
    const warnings: string[] = [];
    const imported: string[] = [];
    if (sets.length > TEAM_SIZE) warnings.push(`Only the first ${TEAM_SIZE} Pokémon were imported.`);

    const itemNames = new Set((await fetchCompetitiveItemNameList()).map((i) => i.name));
    const store = useTeamStore.getState();
    store.clearTeam();

    const seen = new Set<string>();
    let slotIndex = 0;
    for (const set of sets.slice(0, TEAM_SIZE)) {
      const detail = await resolveSpecies(set.species);
      if (!detail) { warnings.push(`"${set.displayName}" wasn't found — skipped.`); continue; }
      if (seen.has(detail.name)) { warnings.push(`${detail.name} is a duplicate (species clause) — skipped.`); continue; }
      seen.add(detail.name);

      const i = slotIndex++;
      store.setSlotPokemon(i, detail);
      if (set.item) {
        store.setSlotItem(i, set.item);
        if (!itemNames.has(set.item)) warnings.push(`${detail.name}: item "${set.item}" isn't in the item list — kept anyway.`);
      }
      if (set.ability) {
        if (detail.abilities.some((a) => a.name === set.ability)) store.setSlotAbility(i, set.ability);
        else warnings.push(`${detail.name}: ability "${set.ability}" isn't legal for it — left unset.`);
      }
      set.moves.forEach((move, mi) => {
        if (detail.moves.some((m) => m.name === move)) store.setSlotMove(i, mi, move);
        else warnings.push(`${detail.name}: move "${move}" not found — skipped.`);
      });
      // setSlotMove takes the index from the paste; compact so skipped moves don't leave gaps
      const kept = useTeamStore.getState().slots[i].moves.filter((m): m is string => m !== null);
      [0, 1, 2, 3].forEach((mi) => store.setSlotMove(i, mi, kept[mi] ?? null));

      if (set.nature) store.setSlotNature(i, set.nature);
      store.setSlotSpeedEv(i, set.speedEv);
      imported.push(detail.name);
    }

    setStatus("idle");
    setReport({ imported, warnings });
    if (warnings.length === 0) { setText(""); setReport(null); onClose(); }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label="Import team from Showdown"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="pokecard flex max-h-[92dvh] w-full max-w-lg flex-col rounded-b-none sm:rounded-b-[1.25rem]"
            style={{ borderColor: "var(--accent-gold)" }}
          >
            <div className="h-2 shrink-0 bg-gradient-to-r from-[color:var(--shell-accent)] via-[color:var(--accent-gold)] to-[color:var(--shell-accent)]" />
            <div className="flex-1 overflow-y-auto bg-[color:var(--screen)] p-4">
              <h2 className="font-heading text-lg text-[color:var(--ink)]">Import from Showdown</h2>
              <p className="mt-1 text-xs text-[color:var(--ink)]/60">
                Paste a team in Pokémon Showdown format. This <strong>replaces your current team</strong>. Item, ability,
                moves, nature and Speed EVs are imported; everything is checked against PokeAPI data.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                spellCheck={false}
                placeholder={"Garchomp @ Life Orb\nAbility: Rough Skin\nEVs: 4 HP / 252 Atk / 252 Spe\nJolly Nature\n- Dragon Claw\n- Rock Slide\n- Earthquake\n- Protect"}
                className="mt-3 w-full resize-none rounded-md border border-black/10 bg-white px-3 py-2 font-mono text-xs text-[color:var(--ink)] outline-none placeholder:text-black/30 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
              />
              {report && (
                <div className="mt-3 space-y-1 text-xs">
                  {report.imported.length > 0 && (
                    <p className="rounded-md bg-emerald-100 px-3 py-2 text-emerald-900 capitalize">
                      Imported: {report.imported.join(", ")}
                    </p>
                  )}
                  {report.warnings.map((w, i) => (
                    <p key={i} className="rounded-md bg-[color:var(--accent-gold)]/30 px-3 py-1.5 text-[color:var(--ink)]">{w}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-2 bg-[color:var(--screen)] p-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={onClose} className="flex-1 rounded-md bg-black/10 px-3 py-2.5 text-sm font-medium text-[color:var(--ink)] btn-tactile">
                {report ? "Close" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!text.trim() || status === "loading"}
                className="flex-1 rounded-md bg-[color:var(--shell-accent)] px-3 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 btn-tactile btn-glow-accent"
              >
                {status === "loading" ? "Importing…" : "Import team"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}