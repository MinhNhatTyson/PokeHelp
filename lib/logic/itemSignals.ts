export interface ItemSignal {
  /** PokeAPI item slug, e.g. "choice-scarf" */
  name: string;
  /** Multiplies this mon's effective speed for lead/speed-race heuristics (not a real stat mutation) */
  speedMultiplier?: number;
  /** Roughly guarantees surviving one hit at full HP (Focus Sash) — softens weakness penalties in scoring */
  guaranteesSurvival?: boolean;
  /** Meaningfully raises a bulk stat (Assault Vest-style) — softens weakness penalties less than a Sash */
  isBulkBoost?: boolean;
  /** Converts being hit by a weakness into a setup opportunity (Weakness Policy) */
  isWeaknessPolicy?: boolean;
  /** Lets the holder pivot out safely after taking one hit (Eject Button/Pack) */
  isEjectTool?: boolean;
}

// Deliberately small and curated — same philosophy as abilitySignals.ts. Only
// items with a clear, scoring-relevant VGC signal are here, not every held item.
export const ITEM_SIGNALS: Record<string, ItemSignal> = {
  "choice-scarf": { name: "choice-scarf", speedMultiplier: 1.5 },
  "focus-sash": { name: "focus-sash", guaranteesSurvival: true },
  "assault-vest": { name: "assault-vest", isBulkBoost: true },
  "weakness-policy": { name: "weakness-policy", isWeaknessPolicy: true },
  "eject-button": { name: "eject-button", isEjectTool: true },
  "eject-pack": { name: "eject-pack", isEjectTool: true },
  "iron-ball": { name: "iron-ball", speedMultiplier: 0.5 },
};

export function getItemSignal(itemName: string | null | undefined): ItemSignal | null {
  if (!itemName) return null;
  return ITEM_SIGNALS[itemName] ?? null;
}