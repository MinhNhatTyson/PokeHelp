import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AI_MODELS, AUTO_MODEL } from "@/lib/aiModels";

interface AiSettingsState {
  model: string; // "auto" or a model id from AI_MODELS
  setModel: (model: string) => void;
}

export const useAiSettingsStore = create<AiSettingsState>()(
  persist(
    (set) => ({ model: AUTO_MODEL, setModel: (model) => set({ model }) }),
    {
      name: "pokehelp-ai-settings",
      // Runs on every load: if the saved model was retired from AI_MODELS, fall back to Auto
      // so the Settings radio group never ends up with nothing selected.
      merge: (persisted, current) => {
        const saved = (persisted as { model?: string } | undefined)?.model;
        const valid = saved === AUTO_MODEL || AI_MODELS.some((m) => m.id === saved);
        return { ...current, model: valid && saved ? saved : current.model };
      },
    }
  )
);