import { create } from "zustand";
import { FieldState, BattleEvent, BattleConversationTurn, ActiveBattlers, FaintedMons } from "@/lib/types";
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
  initialLeads: ActiveBattlers | null;
  fieldState: FieldState;
  currentTurnEvents: BattleEvent[];
  conversation: BattleConversationTurn[];
  turnNumber: number;
  adviceStatus: "idle" | "loading" | "error";

  startSession: (yourTeamNames: string[], opponentTeamNames: string[], activeBattlers: ActiveBattlers) => void;
  resetSession: () => void;
  setFieldState: (updates: Partial<FieldState>) => void;
  addEvent: (fragment: string, extra?: Pick<BattleEvent, "switch" | "faint">) => void;
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
      // Only newly fainted Pokémon are recorded on the event, so removing it revives exactly those.
      const added = (extra?.faint ?? []).filter((f) => !state.fainted[f.side].includes(f.name));
      let fainted = state.fainted;
      for (const f of added) fainted = { ...fainted, [f.side]: [...fainted[f.side], f.name] };
      return {
        fainted,
        currentTurnEvents: [
          ...state.currentTurnEvents,
          { id: crypto.randomUUID(), sentenceFragment: fragment, switch: extra?.switch, faint: added.length ? added : undefined },
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
      return { currentTurnEvents: state.currentTurnEvents.filter((e) => e.id !== id), activeBattlers, fainted };
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

    const fieldSummary = describeFieldState(state.fieldState);
    const eventsSummary = state.currentTurnEvents.map((e) => e.sentenceFragment).join(". ");
    const compiledSentence = [fieldSummary, eventsSummary].filter(Boolean).join(". ") + ".";

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
          activeNote: describeBattlers(state.activeBattlers, state.fainted, state.yourTeamNames.length),
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
        fieldState: decrementCounters(s.fieldState),
      }));
    } catch {
      set({ adviceStatus: "error" });
    }
  },
}));

function describeBattlers(a: ActiveBattlers, fainted: FaintedMons, yourTotal: number): string {
  const live = (list: (string | null)[], down: string[]) =>
    list.filter((n): n is string => n !== null && !down.includes(n)).join(" + ") || "none";
  const names = (l: string[]) => (l.length ? l.join(", ") : "none");
  return (
    `On the field after this turn — yours: ${live(a.yours, fainted.yours)}; opponent's: ${live(a.opponent, fainted.opponent)}. ` +
    `Fainted — yours: ${names(fainted.yours)}; opponent's: ${names(fainted.opponent)}. ` +
    `Remaining — you: ${Math.max(0, yourTotal - fainted.yours.length)} of ${yourTotal}, opponent: ${Math.max(0, 4 - fainted.opponent.length)} of 4`
  );
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