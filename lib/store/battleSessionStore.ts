import { create } from "zustand";
import { FieldState, BattleEvent, BattleConversationTurn, ActiveBattlers, FaintedMons, HpState, HpChange, BattleSide, MonRef, PerMon, PokemonTypeName, StatusKind, StatusState, PokemonDetail, StageState, StageStat } from "@/lib/types";
import { useTeamStore } from "./teamStore";
import { useOpponentTeamStore } from "./opponentTeamStore";
import { cap, checkBerry, computeEndOfTurn, ResidualMon } from "@/lib/logic/residualEffects";
import { useAiSettingsStore } from "./aiSettingsStore";
import { useLiveSessionStore } from "./liveSessionStore";
import { getCommonSet, synthesizeMegaDetail } from "@/lib/data/commonSets";
import { getAbilitySignal } from "@/lib/logic/abilitySignals";
import { fetchPokemonDetail } from "@/lib/data/fetchAndCache";
import { computeEntryEffects, applyStageDeltas } from "@/lib/logic/entryEffects";

const EMPTY_FIELD_STATE: FieldState = {
  weather: "none",
  weatherTurnsLeft: 0,
  terrain: "none",
  terrainTurnsLeft: 0,
  trickRoomTurnsLeft: 0,
  tailwindTurnsLeft: { yours: 0, opponents: 0 },
};

const EMPTY_ACTIVE_BATTLERS: ActiveBattlers = { yours: [null, null], opponent: [null, null] };
export type OpponentReveal = { item?: string | null; ability?: string }; // item: null = confirmed no item; key absent = still a guess

interface BattleSessionState {
  started: boolean;
  sessionId: string | null;
  yourTeamNames: string[];
  opponentTeamNames: string[];
  activeBattlers: ActiveBattlers;
  fainted: FaintedMons;
  hp: HpState;
  status: StatusState;
  toxicTurns: PerMon<number>;
  itemUsed: PerMon<boolean>;
  stages: StageState;
  setStage: (side: BattleSide, name: string, stat: StageStat, value: number) => void;
  lastResiduals: string[];
  megaUsed: Record<BattleSide, string | null>;   // one Mega per side per battle
  megaDetails: Record<string, PokemonDetail>; 
  opponentReveals: Record<string, OpponentReveal>;
  revealItem: (name: string, item: string | null | undefined) => void;   // undefined = back to guess
  revealAbility: (name: string, ability: string | undefined) => void;
  initialLeads: ActiveBattlers | null;
  fieldState: FieldState;
  currentTurnEvents: BattleEvent[];
  conversation: BattleConversationTurn[];
  turnNumber: number;
  adviceStatus: "idle" | "loading" | "error";

  startSession: (yourTeamNames: string[], opponentTeamNames: string[], activeBattlers: ActiveBattlers) => void;
  resetSession: () => void;
  setFieldState: (updates: Partial<FieldState>) => void;
  addEvent: (fragment: string, extra?: Pick<BattleEvent, "switch" | "faint" | "damage" | "status" | "mega">) => void;
  removeEvent: (id: string) => void;
  switchActiveBattler: (side: "yours" | "opponent", outgoingName: string, incomingName: string) => void;
  submitTurn: () => Promise<void>;
  loadMegaDetail: (side: BattleSide, name: string) => Promise<void>;
}

const initialState = {
  started: false,
  sessionId: null as string | null,
  yourTeamNames: [] as string[],
  opponentTeamNames: [] as string[],
  activeBattlers: EMPTY_ACTIVE_BATTLERS,
  fainted: { yours: [], opponent: [] } as FaintedMons,
  hp: { yours: {}, opponent: {} } as HpState,
  status: { yours: {}, opponent: {} } as StatusState,
  toxicTurns: { yours: {}, opponent: {} } as PerMon<number>,
  itemUsed: { yours: {}, opponent: {} } as PerMon<boolean>,
  stages: { yours: {}, opponent: {} } as StageState,
  lastResiduals: [] as string[],
  megaUsed: { yours: null, opponent: null } as Record<BattleSide, string | null>,
  megaDetails: {} as Record<string, PokemonDetail>,
  opponentReveals: {} as Record<string, OpponentReveal>,
  initialLeads: null as ActiveBattlers | null,
  fieldState: EMPTY_FIELD_STATE,
  currentTurnEvents: [] as BattleEvent[],
  conversation: [] as BattleConversationTurn[],
  turnNumber: 1,
  adviceStatus: "idle" as const,
};

export const useBattleSessionStore = create<BattleSessionState>((set, get) => ({
  ...initialState,

  startSession: (yourTeamNames, opponentTeamNames, activeBattlers) => {
    set({ ...initialState, started: true, sessionId: crypto.randomUUID(), yourTeamNames, opponentTeamNames, activeBattlers, initialLeads: activeBattlers });
    set((s) => applyLeadEntries(s)); 
  },

  resetSession: () => {
    const s = get();
    const prev = useLiveSessionStore.getState().snapshot;
    if (s.started && s.sessionId && prev?.sessionId !== s.sessionId) captureLiveSession();
    set({ ...initialState });
  },

  setFieldState: (updates) =>
    set((state) => ({ fieldState: { ...state.fieldState, ...updates } })),

  addEvent: (fragment, extra) =>
    set((state) => {
      let hp = state.hp;
      let status = state.status;
      let itemUsed = state.itemUsed;
      const changes: HpChange[] = [];
      const consumed: MonRef[] = [];
      const berryNotes: string[] = [];
      const currentHp = (side: BattleSide, name: string) => hp[side][name] ?? 100;
      const setHp = (side: BattleSide, name: string, value: number) => {
        hp = { ...hp, [side]: { ...hp[side], [name]: value } };
      };

      // Damage first; anything reaching 0 HP also counts as a faint.
      const knockedOut: MonRef[] = [...(extra?.faint ?? [])];
      for (const d of extra?.damage ?? []) {
        const cur = currentHp(d.side, d.name);
        const delta = Math.round(d.pct); // + = HP lost, − = HP restored
        if (delta === 0) continue;
        if (delta < 0 && (cur <= 0 || state.fainted[d.side].includes(d.name))) continue; // can't heal a fainted mon
        const applied = delta > 0 ? Math.min(cur, delta) : -Math.min(100 - cur, -delta);
        if (applied === 0) continue;
        setHp(d.side, d.name, cur - applied);
        changes.push({ side: d.side, name: d.name, pct: applied });
        if (cur - applied === 0) knockedOut.push({ side: d.side, name: d.name });
      }

      // Berries fire the moment a hit leaves the holder low enough (Sitrus ≤50%, Figy-type ≤25%)
      for (const c of [...changes]) {
        if (c.pct <= 0 || consumed.some((x) => x.side === c.side && x.name === c.name)) continue;
        const cur = currentHp(c.side, c.name);
        const berry = checkBerry(loadoutOf(c.side, c.name).item, cur, !!itemUsed[c.side][c.name]);
        if (!berry) continue;
        const heal = Math.min(berry.heal, 100 - cur);
        if (heal <= 0) continue;
        setHp(c.side, c.name, cur + heal);
        changes.push({ side: c.side, name: c.name, pct: -heal });
        itemUsed = { ...itemUsed, [c.side]: { ...itemUsed[c.side], [c.name]: true } };
        consumed.push({ side: c.side, name: c.name });
        berryNotes.push(`${cap(c.name)} ate its ${berry.label} and recovered to ${cur + heal}%`);
      }

      for (const sc of extra?.status ?? []) {
        const next = { ...status[sc.side] };
        if (sc.next) next[sc.name] = sc.next;
        else delete next[sc.name];
        status = { ...status, [sc.side]: next };
      }

      // Only newly fainted mons are recorded, so removing the event revives exactly those.
      const added = knockedOut.filter(
        (f, i) =>
          knockedOut.findIndex((x) => x.side === f.side && x.name === f.name) === i &&
          !state.fainted[f.side].includes(f.name)
      );
      let fainted = state.fainted;
      for (const f of added) {
        fainted = { ...fainted, [f.side]: [...fainted[f.side], f.name] };
        const cur = currentHp(f.side, f.name); // manual "Faint" events: drain whatever HP is left
        if (cur > 0) { setHp(f.side, f.name, 0); changes.push({ side: f.side, name: f.name, pct: cur }); }
      }

      let megaUsed = state.megaUsed;
      let fieldState = state.fieldState;
      let megaEvent: BattleEvent["mega"];
      if (extra?.mega) {
        const { side, name } = extra.mega;
        const form = getCommonSet(name)?.megaForm;
        if (form && !megaUsed[side]) {
          megaUsed = { ...megaUsed, [side]: name };
          // The Mega's ability activates on evolving (Drought etc.); it can't change weather that is already up
          const kind = getAbilitySignal(form.formAbility)?.weatherSets;
          let prevWeather: { weather: FieldState["weather"]; turnsLeft: number } | undefined;
          if (kind && fieldState.weather !== kind) {
            prevWeather = { weather: fieldState.weather, turnsLeft: fieldState.weatherTurnsLeft };
            fieldState = { ...fieldState, weather: kind, weatherTurnsLeft: 5 };
          }
          megaEvent = { side, name, prevWeather };
        }
      }

      // Switch-in: the outgoing mon's stages reset, then the incoming mon's entry abilities fire
      let stages = state.stages;
      let stageChanges: BattleEvent["stages"];
      let clearedStages: BattleEvent["clearedStages"];
      let fieldPrev: BattleEvent["fieldPrev"];
      const entryNotes: string[] = [];
      if (extra?.switch) {
        const { side, out, in: incoming } = extra.switch;
        const old = stages[side][out];
        if (old && Object.values(old).some((v) => v)) {
          clearedStages = [{ side, name: out, stages: old }];
          const rest = { ...stages[side] };
          delete rest[out];
          stages = { ...stages, [side]: rest };
        }
        const other: BattleSide = side === "yours" ? "opponent" : "yours";
        const foes = state.activeBattlers[other]
          .filter((n): n is string => !!n && !state.fainted[other].includes(n))
          .map((n) => ({ name: n, ability: loadoutOf(other, n).ability }));
        const res = computeEntryEffects({
          side, name: incoming, ability: loadoutOf(side, incoming).ability, foes, field: fieldState,
          stageOf: (s, n, k) => stages[s][n]?.[k] ?? 0,
        });
        if (res.stageChanges.length > 0) { stageChanges = res.stageChanges; stages = applyStageDeltas(stages, res.stageChanges); }
        if (res.field) { fieldPrev = res.fieldPrev; fieldState = { ...fieldState, ...res.field }; }
        entryNotes.push(...res.notes);
      }

      return {
        hp,
        fainted,
        status,
        itemUsed,
        megaUsed, fieldState,
        stages,
        currentTurnEvents: [
          ...state.currentTurnEvents,
          {
            id: crypto.randomUUID(),
            sentenceFragment: [fragment, ...berryNotes, ...entryNotes].join("; "),
            switch: extra?.switch,
            faint: added.length ? added : undefined,
            damage: changes.length ? changes : undefined,
            status: extra?.status,
            consumed: consumed.length ? consumed : undefined,
            mega: megaEvent,
            stages: stageChanges,
            clearedStages,
            fieldPrev,
          },
        ],
      };
    }),

  // Removing an event also undoes what it did to the field: a Switch puts the outgoing Pokémon back,
  // a KO / Faint revives the Pokémon. Remove the newest events first when undoing several.
  removeEvent: (id) =>
    set((state) => {
      const ev = state.currentTurnEvents.find((e) => e.id === id);
      let activeBattlers = state.activeBattlers;
      let fainted = state.fainted;
      let hp = state.hp;
      let status = state.status;
      let itemUsed = state.itemUsed;
      let megaUsed = state.megaUsed;
      let megaDetails = state.megaDetails;
      let fieldState = state.fieldState;
      let stages = state.stages;
      if (ev?.stages) stages = applyStageDeltas(stages, ev.stages, -1);
      for (const c of ev?.clearedStages ?? []) stages = { ...stages, [c.side]: { ...stages[c.side], [c.name]: c.stages } };
      if (ev?.fieldPrev) fieldState = { ...fieldState, ...ev.fieldPrev };
      if (ev?.mega) {
        const key = `${ev.mega.side}:${ev.mega.name}`;
        megaUsed = { ...megaUsed, [ev.mega.side]: null };
        megaDetails = Object.fromEntries(Object.entries(megaDetails).filter(([k]) => k !== key));
        if (ev.mega.prevWeather) {
          fieldState = { ...fieldState, weather: ev.mega.prevWeather.weather, weatherTurnsLeft: ev.mega.prevWeather.turnsLeft };
        }
      }
      if (ev?.switch) {
        const { side, out, in: incoming } = ev.switch;
        const list = [...activeBattlers[side]];
        const idx = list.indexOf(incoming);
        if (idx !== -1) {
          list[idx] = out;
          activeBattlers = { ...activeBattlers, [side]: list };
        }
      }
      for (const f of ev?.faint ?? []) fainted = { ...fainted, [f.side]: fainted[f.side].filter((n) => n !== f.name) };
      for (const d of ev?.damage ?? []) {
        hp = { ...hp, [d.side]: { ...hp[d.side], [d.name]: (hp[d.side][d.name] ?? 100) + d.pct } };
      }
      for (const sc of ev?.status ?? []) {
        const next = { ...status[sc.side] };
        if (sc.prev) next[sc.name] = sc.prev;
        else delete next[sc.name];
        status = { ...status, [sc.side]: next };
      }
      for (const c of ev?.consumed ?? []) {
        itemUsed = { ...itemUsed, [c.side]: { ...itemUsed[c.side], [c.name]: false } };
      }
      return { currentTurnEvents: state.currentTurnEvents.filter((e) => e.id !== id), activeBattlers, fainted, hp, status, itemUsed, megaUsed, megaDetails, fieldState, stages };
    }),

  // Called when a Switch event is confirmed — swaps the outgoing mon for the
  // incoming one in that side's active pair. No-op if outgoingName isn't
  // currently active (shouldn't happen via the UI, but fails soft).
  switchActiveBattler: (side, outgoingName, incomingName) =>
    set((state) => {
      const list = [...state.activeBattlers[side]];
      const idx = list.indexOf(outgoingName);
      if (idx === -1) return state;
      list[idx] = incomingName;
      return { activeBattlers: { ...state.activeBattlers, [side]: list } };
    }),

  setStage: (side, name, stat, value) =>
    set((s) => ({
      stages: {
        ...s.stages,
        [side]: { ...s.stages[side], [name]: { ...s.stages[side][name], [stat]: Math.max(-6, Math.min(6, Math.round(value))) } },
      },
    })),

  submitTurn: async () => {
    const state = get();
    if (state.currentTurnEvents.length === 0) return;

    const eot = projectEndOfTurn(state); // computed now, committed only if the request succeeds (a retry can't double-apply)

    const fieldSummary = describeFieldState(state.fieldState);
    const eventsSummary = state.currentTurnEvents.map((e) => e.sentenceFragment).join(". ");
    const residualSummary = eot.notes.length > 0 ? `End of turn: ${eot.notes.join("; ")}` : "";
    const compiledSentence = [fieldSummary, eventsSummary, residualSummary].filter(Boolean).join(". ") + ".";

    set({ adviceStatus: "loading" });

    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yourTeam: state.yourTeamNames,
          opponentTeam: state.opponentTeamNames,
          conversation: state.conversation,
          newTurnSentence: compiledSentence,
          activeNote: describeBattlers(state.activeBattlers, eot.fainted, state.yourTeamNames.length, eot.hp, state.status, state.megaUsed, state.stages),
          yourLoadouts: state.yourTeamNames.map((name) => {
            const slot = useTeamStore.getState().slots.find((x) => x.pokemon?.name === name);
            return {
              name,
              item: slot?.itemName ?? null,
              ability: slot?.abilityName ?? null,
              nature: slot?.nature ?? null,
              moves: slot?.moves.filter((m): m is string => m !== null) ?? [],
            };
          }),
          opponentGuesses: state.opponentTeamNames.map((name) => {
            const rev = state.opponentReveals[name];
            return {
              name, ...loadoutOf("opponent", name),
              itemConfirmed: !!rev && "item" in rev,
              abilityConfirmed: !!rev?.ability || state.megaUsed.opponent === name,
            };
          }),
          model: useAiSettingsStore.getState().model,
        }),
      });

      if (!res.ok) throw new Error("request failed");
      const data = await res.json();

      set((s) => ({
        conversation: [
          ...s.conversation,
          { role: "user", text: compiledSentence },
          { role: "model", text: data.advice },
        ],
        currentTurnEvents: [],
        turnNumber: s.turnNumber + 1,
        adviceStatus: "idle",
        hp: eot.hp,
        fainted: eot.fainted,
        itemUsed: eot.itemUsed,
        toxicTurns: eot.toxicTurns,
        lastResiduals: eot.notes,
        fieldState: decrementCounters(s.fieldState),
      }));
    } catch {
      set({ adviceStatus: "error" });
    }
  },

  loadMegaDetail: async (side, name) => {
    const form = getCommonSet(name)?.megaForm;
    if (!form) return;
    const base = side === "yours"
      ? useTeamStore.getState().slots.find((x) => x.pokemon?.name === name)?.pokemon
      : useOpponentTeamStore.getState().slots.find((x) => x.pokemon?.name === name)?.pokemon;
    const detail = (await fetchPokemonDetail(form.formSpecies)) ?? (base ? synthesizeMegaDetail(base, form) : null);
    if (!detail) return;
    // Ignore the result if the Mega event was undone while the request was running
    set((s) => (s.megaUsed[side] === name ? { megaDetails: { ...s.megaDetails, [`${side}:${name}`]: detail } } : s));
  },

  revealItem: (name, item) =>
    set((s) => {
      const cur: OpponentReveal = { ...s.opponentReveals[name] };
      if (item === undefined) delete cur.item;
      else cur.item = item;
      return { opponentReveals: { ...s.opponentReveals, [name]: cur } };
    }),

  revealAbility: (name, ability) =>
    set((s) => {
      const cur: OpponentReveal = { ...s.opponentReveals[name] };
      if (ability === undefined) delete cur.ability;
      else cur.ability = ability;
      return { opponentReveals: { ...s.opponentReveals, [name]: cur } };
    }),
}));

function describeBattlers(a: ActiveBattlers, fainted: FaintedMons, yourTotal: number, hp: HpState, status: StatusState, megaUsed: Record<BattleSide, string | null>, stages: StageState): string {
  const live = (list: (string | null)[], down: string[]) =>
    list.filter((n): n is string => n !== null && !down.includes(n)).join(" + ") || "none";
  const names = (l: string[]) => (l.length ? l.join(", ") : "none");
  const hurt = (side: BattleSide) => {
    const list = Object.entries(hp[side])
      .filter(([n, v]) => v > 0 && v < 100 && !fainted[side].includes(n))
      .map(([n, v]) => `${n} ${v}%`);
    return list.length ? list.join(", ") : "all at full HP";
  };
  const afflicted = (side: BattleSide) => {
    const list = Object.entries(status[side])
      .filter(([n]) => !fainted[side].includes(n))
      .map(([n, k]) => `${n} (${k === "toxic" ? "badly poisoned" : k})`);
    return list.length ? list.join(", ") : "none";
  };
  const megaLine = (side: BattleSide) => {
    const n = megaUsed[side];
    if (!n) return "not used yet";
    const f = getCommonSet(n)?.megaForm;
    return f ? `${n} became ${f.formShowdownName} (ability now ${f.formAbility.replace(/-/g, " ")}; its old ability no longer applies)` : `${n} Mega Evolved`;
  };
  const staged = (side: BattleSide) => {
    const list = Object.entries(stages[side])
      .filter(([n]) => !fainted[side].includes(n))
      .flatMap(([n, st]) => Object.entries(st).filter(([, v]) => v).map(([k, v]) => `${n} ${k} ${v! > 0 ? "+" : ""}${v}`));
    return list.length ? list.join(", ") : "none";
  };
  return (
    `On the field after this turn — yours: ${live(a.yours, fainted.yours)}; opponent's: ${live(a.opponent, fainted.opponent)}. ` +
    `Fainted — yours: ${names(fainted.yours)}; opponent's: ${names(fainted.opponent)}. ` +
    `Remaining HP (% of max) — yours: ${hurt("yours")}; opponent's: ${hurt("opponent")}. ` +
    `Status conditions — yours: ${afflicted("yours")}; opponent's: ${afflicted("opponent")}. ` +
    `Stat stages — yours: ${staged("yours")}; opponent's: ${staged("opponent")}. ` +
    `Mega Evolution — yours: ${megaLine("yours")}; opponent's: ${megaLine("opponent")}. A side that has used its Mega cannot Mega again. ` +
    `Remaining — you: ${Math.max(0, yourTotal - fainted.yours.length)} of ${yourTotal}, opponent: ${Math.max(0, 4 - fainted.opponent.length)} of 4`
  );
}

/** Loadout BEFORE any Mega Evolution. Scouting pre-fills the Mega ability on opponents, so that guess is undone here. */
/** Opponent loadout straight from scouting (common-set guesses), before in-battle reveals or Mega. */
export function scoutedOpponentLoadout(name: string): { types: PokemonTypeName[]; item: string | null; ability: string | null } {
  const o = useOpponentTeamStore.getState().slots.find((x) => x.pokemon?.name === name);
  const cs = getCommonSet(name);
  // Scouting pre-fills the Mega ability when the stone is guessed; before the Mega happens that is wrong
  const ability =
    cs?.megaForm && o?.abilityName === cs.megaForm.formAbility
      ? (o.pokemon?.abilities.some((a) => a.name === cs.likelyAbility) ? cs.likelyAbility : null)
      : o?.abilityName ?? null;
  return { types: o?.pokemon?.types ?? [], item: o?.itemName ?? null, ability };
}

/** Loadout BEFORE any Mega Evolution, with what the player has confirmed in battle layered over the guess. */
export function baseLoadoutOf(side: BattleSide, name: string): { types: PokemonTypeName[]; item: string | null; ability: string | null } {
  if (side === "yours") {
    const s = useTeamStore.getState().slots.find((x) => x.pokemon?.name === name);
    return { types: s?.pokemon?.types ?? [], item: s?.itemName ?? null, ability: s?.abilityName ?? null };
  }
  const scouted = scoutedOpponentLoadout(name);
  const rev = useBattleSessionStore.getState().opponentReveals[name];
  return {
    types: scouted.types,
    item: rev && "item" in rev ? rev.item ?? null : scouted.item,
    ability: rev?.ability ?? scouted.ability,
  };
}

/** What a mon is RIGHT NOW: once it has Mega Evolved, the Mega's ability (and typing) replace the base ones. */
export function loadoutOf(side: BattleSide, name: string): { types: PokemonTypeName[]; item: string | null; ability: string | null } {
  const base = baseLoadoutOf(side, name);
  const st = useBattleSessionStore.getState();
  const form = st.megaUsed[side] === name ? getCommonSet(name)?.megaForm : undefined;
  if (!form) return base;
  const scouted = side === "opponent"
    ? useOpponentTeamStore.getState().slots.find((x) => x.pokemon?.name === name)?.megaFormDetail?.types
    : undefined;
  return { ...base, ability: form.formAbility, types: form.formTypes ?? st.megaDetails[`${side}:${name}`]?.types ?? scouted ?? base.types };
}

/** What the end of this turn would do right now, without committing anything. */
function projectEndOfTurn(s: BattleSessionState) {
  const mons: ResidualMon[] = [];
  for (const side of ["yours", "opponent"] as const) {
    for (const name of s.activeBattlers[side]) {
      if (!name || s.fainted[side].includes(name)) continue;
      const l = loadoutOf(side, name);
      mons.push({
        side, name, hp: s.hp[side][name] ?? 100, types: l.types, item: l.item, ability: l.ability,
        status: s.status[side][name] ?? null,
        toxicTurns: s.toxicTurns[side][name] ?? 0,
        itemUsed: !!s.itemUsed[side][name],
      });
    }
  }
  const out = computeEndOfTurn(mons, s.fieldState);

  let hp = s.hp;
  let fainted = s.fainted;
  let itemUsed = s.itemUsed;
  for (const c of out.changes) {
    const cur = hp[c.side][c.name] ?? 100;
    hp = { ...hp, [c.side]: { ...hp[c.side], [c.name]: cur - c.pct } };
  }
  for (const f of out.fainted) fainted = { ...fainted, [f.side]: [...fainted[f.side], f.name] };
  for (const c of out.consumed) itemUsed = { ...itemUsed, [c.side]: { ...itemUsed[c.side], [c.name]: true } };

  // Bad-poison counters survive only for mons still on the field and still badly poisoned
  const toxicTurns: PerMon<number> = { yours: {}, opponent: {} };
  for (const t of out.toxic) toxicTurns[t.side][t.name] = t.turns;

  return { hp, fainted, itemUsed, toxicTurns, notes: out.notes };
}

/** For the "applied automatically at end of turn" preview in the Live Battle UI. */
export function previewEndOfTurn(): string[] {
  const s = useBattleSessionStore.getState();
  return s.started ? projectEndOfTurn(s).notes : [];
}

function describeFieldState(f: FieldState): string {
  const parts: string[] = [];
  if (f.weather !== "none") parts.push(`Weather is ${f.weather}${f.weatherTurnsLeft > 0 ? ` (${f.weatherTurnsLeft} turns left)` : ""}`);
  if (f.terrain !== "none") parts.push(`${f.terrain} terrain is active${f.terrainTurnsLeft > 0 ? ` (${f.terrainTurnsLeft} turns left)` : ""}`);
  if (f.trickRoomTurnsLeft > 0) parts.push(`Trick Room has ${f.trickRoomTurnsLeft} turns left`);
  if (f.tailwindTurnsLeft.yours > 0) parts.push(`Your Tailwind has ${f.tailwindTurnsLeft.yours} turns left`);
  if (f.tailwindTurnsLeft.opponents > 0) parts.push(`Opponent's Tailwind has ${f.tailwindTurnsLeft.opponents} turns left`);
  return parts.join(", ");
}

function decrementCounters(f: FieldState): FieldState {
  return {
    ...f,
    weatherTurnsLeft: Math.max(0, f.weatherTurnsLeft - 1),
    terrainTurnsLeft: Math.max(0, f.terrainTurnsLeft - 1),
    trickRoomTurnsLeft: Math.max(0, f.trickRoomTurnsLeft - 1),
    tailwindTurnsLeft: {
      yours: Math.max(0, f.tailwindTurnsLeft.yours - 1),
      opponents: Math.max(0, f.tailwindTurnsLeft.opponents - 1),
    },
  };
}

function applyLeadEntries(s: BattleSessionState): Partial<BattleSessionState> {
  let stages = s.stages;
  let fieldState = s.fieldState;
  for (const side of ["yours", "opponent"] as const) {
    const other: BattleSide = side === "yours" ? "opponent" : "yours";
    for (const name of s.activeBattlers[side]) {
      if (!name) continue;
      const foes = s.activeBattlers[other].filter((n): n is string => !!n).map((n) => ({ name: n, ability: loadoutOf(other, n).ability }));
      const res = computeEntryEffects({
        side, name, ability: loadoutOf(side, name).ability, foes, field: fieldState, startOfBattle: true,
        stageOf: (sd, n, k) => stages[sd][n]?.[k] ?? 0,
      });
      stages = applyStageDeltas(stages, res.stageChanges);
      if (res.field) fieldState = { ...fieldState, ...res.field };
    }
  }
  return { stages, fieldState };
}

/** Copies the running session into liveSessionStore so Battle Optimizer can pre-fill its result logger. */
export function captureLiveSession(extra: { outcome?: "win" | "loss" | null; reason?: string; logged?: boolean } = {}) {
  const s = useBattleSessionStore.getState();
  if (!s.started || !s.sessionId) return;

  const log = s.conversation.filter((t) => t.role === "user").map((t) => t.text);
  if (s.currentTurnEvents.length > 0) log.push(s.currentTurnEvents.map((e) => e.sentenceFragment).join(". ") + ".");
  if (!extra.logged && log.length === 0) return; // nothing worth keeping

  const named = (list: (string | null)[]) => list.filter((n): n is string => n !== null);
  useLiveSessionStore.getState().setSnapshot({
    sessionId: s.sessionId,
    endedAt: Date.now(),
    yourTeamNames: s.yourTeamNames,
    opponentTeamNames: s.opponentTeamNames,
    yourLeads: named(s.initialLeads?.yours ?? []),
    opponentLeads: named(s.initialLeads?.opponent ?? []),
    turnsPlayed: log.length,
    log,
    outcome: extra.outcome ?? null,
    reason: extra.reason ?? "",
    logged: !!extra.logged,
  });
}