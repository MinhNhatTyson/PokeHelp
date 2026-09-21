import { create } from "zustand";
import { FieldState, BattleEvent, BattleConversationTurn, ActiveBattlers } from "@/lib/types";

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
  yourTeamNames: string[];
  opponentTeamNames: string[];
  activeBattlers: ActiveBattlers;
  fieldState: FieldState;
  currentTurnEvents: BattleEvent[];
  conversation: BattleConversationTurn[];
  turnNumber: number;
  adviceStatus: "idle" | "loading" | "error";

  startSession: (yourTeamNames: string[], opponentTeamNames: string[], activeBattlers: ActiveBattlers) => void;
  resetSession: () => void;
  setFieldState: (updates: Partial<FieldState>) => void;
  addEvent: (fragment: string) => void;
  removeEvent: (id: string) => void;
  switchActiveBattler: (side: "yours" | "opponent", outgoingName: string, incomingName: string) => void;
  submitTurn: () => Promise<void>;
}

const initialState = {
  started: false,
  yourTeamNames: [] as string[],
  opponentTeamNames: [] as string[],
  activeBattlers: EMPTY_ACTIVE_BATTLERS,
  fieldState: EMPTY_FIELD_STATE,
  currentTurnEvents: [] as BattleEvent[],
  conversation: [] as BattleConversationTurn[],
  turnNumber: 1,
  adviceStatus: "idle" as const,
};

export const useBattleSessionStore = create<BattleSessionState>((set, get) => ({
  ...initialState,

  startSession: (yourTeamNames, opponentTeamNames, activeBattlers) =>
    set({ ...initialState, started: true, yourTeamNames, opponentTeamNames, activeBattlers }),

  resetSession: () => set({ ...initialState }),

  setFieldState: (updates) =>
    set((state) => ({ fieldState: { ...state.fieldState, ...updates } })),

  addEvent: (fragment) =>
    set((state) => ({
      currentTurnEvents: [...state.currentTurnEvents, { id: crypto.randomUUID(), sentenceFragment: fragment }],
    })),

  removeEvent: (id) =>
    set((state) => ({ currentTurnEvents: state.currentTurnEvents.filter((e) => e.id !== id) })),

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