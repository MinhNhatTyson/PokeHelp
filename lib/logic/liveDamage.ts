import type { FieldState, OpponentSlot, TeamSlot } from "@/lib/types";
import { getCommonSet } from "@/lib/data/commonSets";
import {
  applyPreset, configFromOpponent, configFromTeamSlot, configToSetup, runDamageCalc,
  type DamageOutcome, type FieldSetup, type MonConfig,
} from "@/lib/logic/damageCalc";
import { baseLoadoutOf, useBattleSessionStore } from "@/lib/store/battleSessionStore";

export type CalcExtras = Pick<FieldSetup, "crit" | "helpingHand" | "reflect" | "lightScreen" | "auroraVeil">;
export const DEFAULT_EXTRAS: CalcExtras = { crit: false, helpingHand: false, reflect: false, lightScreen: false, auroraVeil: false };

const WEATHER: Record<FieldState["weather"], FieldSetup["weather"]> = { none: "", sun: "Sun", rain: "Rain", sand: "Sand", snow: "Snow" };
const TERRAIN: Record<FieldState["terrain"], FieldSetup["terrain"]> = { none: "", electric: "Electric", grassy: "Grassy", misty: "Misty", psychic: "Psychic" };

export function fieldForCalc(f: FieldState, extras: CalcExtras): FieldSetup {
  return { weather: WEATHER[f.weather], terrain: TERRAIN[f.terrain], ...extras };
}

export interface LiveSide {
  side: "yours" | "opponent";
  name: string;
  mega: boolean;     // has this Pokémon actually Mega Evolved yet?
  burned?: boolean;
}

function buildConfig(
  who: LiveSide, role: "attacker" | "defender", teamSlots: TeamSlot[], oppSlots: OpponentSlot[]
): MonConfig | null {
  let cfg: MonConfig | null;
  if (who.side === "yours") {
    const slot = teamSlots.find((s) => s.pokemon?.name === who.name);
    cfg = slot ? configFromTeamSlot(slot) : null;
    // Team Builder only stores Speed SP, so a mon that is being hit gets a balanced bulk guess
    if (cfg && role === "defender") cfg = applyPreset(cfg, "balanced");
  } else {
    const slot = oppSlots.find((s) => s.pokemon?.name === who.name);
    cfg = slot ? configFromOpponent(slot) : null;
    if (cfg) {
      const l = baseLoadoutOf("opponent", who.name); 
      cfg = { ...cfg, item: l.item, ability: l.ability };
    }
    if (cfg && role === "attacker") cfg = applyPreset(cfg, "offense");
  }
  if (!cfg) return null;

  // Layer in-battle reveals over the scouting guess (pre-Mega loadout; the Mega ability is applied below via useMega)
  const loadout = baseLoadoutOf(who.side, who.name);
  cfg = { ...cfg, item: loadout.item, ability: loadout.ability ?? cfg.ability };

  const cs = getCommonSet(who.name);
  const megaForm = cs?.megaForm;
  const useMega = who.mega && !!megaForm;
  // Scouting pre-fills the Mega ability on opponents; don't hand it to a base form
  let ability = cfg.ability;
  if (!useMega && megaForm && ability === megaForm.formAbility) ability = cs?.likelyAbility ?? null;

  const st = useBattleSessionStore.getState().stages[who.side][who.name] ?? {};
  const boosts = { atk: st.atk ?? 0, def: st.def ?? 0, spa: st.spa ?? 0, spd: st.spd ?? 0, spe: st.spe ?? 0 };
  return { ...cfg, useMega, ability, burned: !!who.burned, boosts };
}

export function liveDamage(a: {
  attacker: LiveSide; defender: LiveSide; move: string; field: FieldSetup;
  teamSlots: TeamSlot[]; oppSlots: OpponentSlot[];
}): DamageOutcome | null {
  const atk = buildConfig(a.attacker, "attacker", a.teamSlots, a.oppSlots);
  const def = buildConfig(a.defender, "defender", a.teamSlots, a.oppSlots);
  const atkSetup = atk && configToSetup(atk);
  const defSetup = def && configToSetup(def);
  if (!atkSetup || !defSetup) return null;
  return runDamageCalc(atkSetup, defSetup, a.move.replace(/-/g, " "), a.field);
}