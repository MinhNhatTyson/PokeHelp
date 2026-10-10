import type { TeamSlot } from "@/lib/types";
import { MAX_TOTAL_SP } from "@/lib/logic/statCalc";

// PokeAPI has no "is a Mega Stone" flag for brand-new Champions stones, so: name pattern + exclusions.
const NOT_STONES = new Set(["eviolite", "black-augurite"]);
const STONE_PATTERN = /ite(-[xyz])?$/;

export function isMegaStone(item: string | null | undefined): boolean {
  if (!item || NOT_STONES.has(item)) return false;
  return STONE_PATTERN.test(item);
}

/** Why `item` can't go on slot `index`, or null if it's fine. */
export function itemBlockReason(slots: TeamSlot[], index: number, item: string | null): string | null {
  if (!item) return null;
  const others = slots.filter((_, i) => i !== index);
  if (others.some((s) => s.itemName === item)) return "Item clause: a teammate already holds this item.";
  if (isMegaStone(item) && others.some((s) => isMegaStone(s.itemName))) return "Only one Mega Stone is allowed per team.";
  return null;
}

export function getTeamIssues(slots: TeamSlot[]): string[] {
  const issues: string[] = [];
  const filled = slots.filter((s) => s.pokemon);

  const stones = filled.filter((s) => isMegaStone(s.itemName));
  if (stones.length > 1) {
    issues.push(`Only one Mega Stone per team. You have ${stones.length} (${stones.map((s) => s.pokemon!.name).join(", ")}).`);
  }

  const byItem = new Map<string, string[]>();
  for (const s of filled) {
    if (s.itemName) byItem.set(s.itemName, [...(byItem.get(s.itemName) ?? []), s.pokemon!.name]);
  }
  for (const [item, names] of byItem) {
    if (names.length > 1) issues.push(`Item clause: ${names.join(" and ")} both hold ${item.replace(/-/g, " ")}.`);
  }

  for (const s of filled) {
    const total = Object.values(s.spread).reduce((a, b) => a + b, 0) + s.speedSp;
    if (total > MAX_TOTAL_SP) issues.push(`${s.pokemon!.name} uses ${total}/${MAX_TOTAL_SP} Stat Points.`);
  }
  return issues;
}