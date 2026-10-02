import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AUTO_MODEL } from "@/lib/aiModels";

interface AiSettingsState {
  model: string; // "auto" or a model id from AI_MODELS
  setModel: (model: string) => void;
}

export const useAiSettingsStore = create<AiSettingsState>()(
  persist(
    (set) => ({ model: AUTO_MODEL, setModel: (model) => set({ model }) }),
    { name: "pokehelp-ai-settings" }
  )
);