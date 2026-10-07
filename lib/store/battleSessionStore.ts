import { create } from "zustand";
import { FieldState, BattleEvent, BattleConversationTurn, ActiveBattlers, FaintedMons, HpState, HpChange, BattleSide, MonRef, PerMon, PokemonTypeName, StatusKind, StatusState } from "@/lib/types";
import { useTeamStore } from "./teamStore";
import { useOpponentTeamStore } from "./opponentTeamStore";
import { cap, checkBerry, computeEndOfTurn, ResidualMon } from "@/lib/logic/residualEffects";
import { useAiSettingsStore } from "./aiSettingsStore";
import { useLiveSessionStore } from "./liveSessionStore";

const EMPTY_FIELD_STATE: FieldState = {
  weather: "none",
  weatherTurnsLeft: 0,
  terrain: "none",
  terrainTurnsLeft: 0,
  trickRoomTurnsLeft: 0,
  tailwindTurnsLeft: { yours: 0, opponents: 0 },
};

const EMPTY_ACTIVE_BATTLERS: ActiveBattlers = { yours: [null, null], opponent: [null, null] };

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
  lastResiduals: string[];
  initialLeads: ActiveBattlers | null;
  fieldState: FieldState;
  currentTurnEvents: BattleEvent[];
  conversation: BattleConversationTurn[];
  turnNumber: number;
  adviceStatus: "idle" | "loading" | "error";

  startSession: (yourTeamNames: string[], opponentTeamNames: string[], activeBattlers: ActiveBattlers) => void;
  resetSession: () => void;
  setFieldState: (updates: Partial<FieldState>) => void;
  addEvent: (fragment: string, extra?: Pick<BattleEvent, "switch" | "faint" | "damage" | "status">) => void;
  removeEvent: (id: string) => void;
  switchActiveBattler: (side: "yours" | "opponent", outgoingName: string, incomingName: string) => void;
  submitTurn: () => Promise<void>;
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
  lastResiduals: [] as string[],
  initialLeads: null as ActiveBattlers | null,
  fieldState: EMPTY_FIELD_STATE,
  currentTurnEvents: [] as BattleEvent[],
  conversation: [] as BattleConversationTurn[],
  turnNumber: 1,
  adviceStatus: "idle" as const,
};

export const useBattleSessionStore = create<BattleSessionState>((set, get) => ({
  ...initialState,

  startSession: (yourTeamNames, opponentTeamNames, activeBattlers) =>
    set({ ...initialState, started: true, sessionId: crypto.randomUUID(), yourTeamNames, opponentTeamNames, activeBattlers, initialLeads: activeBattlers }),

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
        berryNotes.push(`${cap(c.name)} ate its ${berry.label}${c.side === "opponent" ? " (assumed)" : ""} and recovered to ${cur + heal}%`);
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

      return {
        hp,
        fainted,
        status,
        itemUsed,
        currentTurnEvents: [
          ...state.currentTurnEvents,
          {
            id: crypto.randomUUID(),
            sentenceFragment: [fragment, ...berryNotes].join("; "),
            switch: extra?.switch,
            faint: added.length ? added : undefined,
            damage: changes.length ? changes : undefined,
            status: extra?.status,
            consumed: consumed.length ? consumed : undefined,
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
      return { currentTurnEvents: state.currentTurnEvents.filter((e) => e.id !== id), activeBattlers, fainted, hp, status, itemUsed };
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
          activeNote: describeBattlers(state.activeBattlers, eot.fainted, state.yourTeamNames.length, eot.hp, state.status),
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
}));

function describeBattlers(a: ActiveBattlers, fainted: FaintedMons, yourTotal: number, hp: HpState, status: StatusState): string {
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
  return (
    `On the field after this turn — yours: ${live(a.yours, fainted.yours)}; opponent's: ${live(a.opponent, fainted.opponent)}. ` +
    `Fainted — yours: ${names(fainted.yours)}; opponent's: ${names(fainted.opponent)}. ` +
    `Remaining HP (% of max) — yours: ${hurt("yours")}; opponent's: ${hurt("opponent")}. ` +
    `Status conditions — yours: ${afflicted("yours")}; opponent's: ${afflicted("opponent")}. ` +
    `Remaining — you: ${Math.max(0, yourTotal - fainted.yours.length)} of ${yourTotal}, opponent: ${Math.max(0, 4 - fainted.opponent.length)} of 4`
  );
}

/** Types / held item / ability for a mon: from Team Builder for yours, from scouting (a guess) for the opponent. */
function loadoutOf(side: BattleSide, name: string): { types: PokemonTypeName[]; item: string | null; ability: string | null } {
  if (side === "yours") {
    const s = useTeamStore.getState().slots.find((x) => x.pokemon?.name === name);
    return { types: s?.pokemon?.types ?? [], item: s?.itemName ?? null, ability: s?.abilityName ?? null };
  }
  const o = useOpponentTeamStore.getState().slots.find((x) => x.pokemon?.name === name);
  const effective = o?.megaFormDetail ?? o?.pokemon;
  return { types: effective?.types ?? [], item: o?.itemName ?? null, ability: o?.abilityName ?? null };
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
        assumed: side === "opponent",
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