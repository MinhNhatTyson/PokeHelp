export const AUTO_MODEL = "auto";

export interface AiModelOption {
  id: string;
  label: string;
  note: string;
}

// Order = auto-fallback order. Checked against this API key on 2026-10-02.
export const AI_MODELS: AiModelOption[] = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", note: "Previous default" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", note: "" },
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", note: "" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (preview)", note: "Preview models can be retired without notice" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", note: "Lighter and faster" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", note: "Lighter and faster" },
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "Newest, but was overloaded when tested" },
];