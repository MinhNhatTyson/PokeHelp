"use client";

import { AnimatePresence, MotionConfig, motion, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { usePathname } from "next/navigation";
import { PokemonTypeName } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/typeMeta";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { useBackdropStore } from "@/lib/store/backdropStore";
import { useTeamStore } from "@/lib/store/teamStore";
import TypeIcon from "@/components/TypeIcon";
import { getScene, type SceneMotif } from "@/lib/backgroundScenes";
import { useBattleHistoryStore, MAX_BATTLE_HISTORY } from "@/lib/store/battleHistoryStore";
import { useBattleSessionStore } from "@/lib/store/battleSessionStore";


const BOOST = 3; // raise/lower to taste (1 = the old values)

// Two iconic Pokédex IDs per type: [left silhouette, right silhouette]
const TYPE_MONS: Record<PokemonTypeName, [number, number]> = {
  normal: [133, 143],   // Eevee, Snorlax
  fire: [6, 59],        // Charizard, Arcanine
  water: [9, 130],      // Blastoise, Gyarados
  electric: [25, 26],   // Pikachu, Raichu
  grass: [3, 254],      // Venusaur, Sceptile
  ice: [471, 144],      // Glaceon, Articuno
  fighting: [448, 68],  // Lucario, Machamp
  poison: [34, 169],    // Nidoking, Crobat
  ground: [445, 530],   // Garchomp, Excadrill
  flying: [18, 398],    // Pidgeot, Staraptor
  psychic: [150, 65],   // Mewtwo, Alakazam
  bug: [214, 637],      // Heracross, Volcarona
  rock: [248, 76],      // Tyranitar, Golem
  ghost: [94, 778],     // Gengar, Mimikyu
  dragon: [149, 373],   // Dragonite, Salamence
  dark: [197, 983],     // Umbreon, Kingambit
  steel: [376, 212],    // Metagross, Scizor
  fairy: [700, 468],    // Sylveon, Togekiss
};

const SILHOUETTE_OPACITY = 0.30;

const ART_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

function Silhouette({ src, color, side, size = "clamp(240px, 36vw, 500px)" }: {
  src: string; color: string; side: "left" | "right"; size?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: SILHOUETTE_OPACITY, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="absolute bottom-0"
      style={{
        [side]: "-3%",
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center bottom",
        maskPosition: "center bottom",
        transform: side === "left" ? "scaleX(-1)" : undefined, // face inward
      }}
    />
  );
}

function maskStyle(src: string, color: string, size: string): CSSProperties {
  return {
    width: size,
    height: size,
    backgroundColor: color,
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center bottom",
    maskPosition: "center bottom",
  };
}

// Team Builder lineup: silhouettes standing along the bottom edge
function LineupSilhouette({ src, color, x }: { src: string; color: string; x: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, left: `${x}%` }}
      animate={{ opacity: SILHOUETTE_OPACITY, y: 0, left: `${x}%` }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="absolute bottom-0"
      style={{
        x: "-50%",
        scaleX: x < 50 ? -1 : 1, // face inward
        width: "clamp(150px, 21vw, 300px)",
        height: "clamp(150px, 21vw, 300px)",
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center bottom",
        maskPosition: "center bottom",
      }}
    />
  );
}


interface Ball { l: number; t: number; s: number; dur: number; delay: number; dx: number; dy: number; rot: number; o: number }

const FAR_BALLS: Ball[] = [
  { l: 6,  t: 10, s: 40, dur: 28, delay: 0,  dx: 20,  dy: -30, rot: 20,  o: 0.05 },
  { l: 30, t: 70, s: 34, dur: 32, delay: -6, dx: -16, dy: -24, rot: -15, o: 0.05 },
  { l: 52, t: 22, s: 28, dur: 26, delay: -3, dx: 14,  dy: -36, rot: 30,  o: 0.04 },
  { l: 74, t: 60, s: 38, dur: 30, delay: -9, dx: -22, dy: -28, rot: -25, o: 0.05 },
  { l: 90, t: 18, s: 32, dur: 34, delay: -4, dx: 12,  dy: -40, rot: 18,  o: 0.04 },
  { l: 18, t: 42, s: 30, dur: 29, delay: -12, dx: 18, dy: -26, rot: -20, o: 0.04 },
];

const NEAR_BALLS: Ball[] = [
  { l: 84, t: 78, s: 120, dur: 24, delay: -2, dx: -30, dy: -50, rot: 25,  o: 0.06 },
  { l: 4,  t: 84, s: 96,  dur: 27, delay: -8, dx: 26,  dy: -44, rot: -22, o: 0.06 },
  { l: 62, t: 6,  s: 88,  dur: 30, delay: -5, dx: -24, dy: -38, rot: 15,  o: 0.05 },
];

const GLYPHS = [
  { l: 10, t: 30, s: 150, o: 0.07 },
  { l: 78, t: 40, s: 190, o: 0.06 },
  { l: 44, t: 82, s: 130, o: 0.06 },
];

const BALL_TINTS = ["#d6362b", "#3b82f6", "#ffc72c", "#f5f5f5", "#a855f7"]; // Poké, Great, Ultra, Premier, Master

function PokeBallShape({ size, opacity, tint }: { size: number; opacity: number; tint?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ opacity: Math.min(1, opacity * BOOST) }} className="text-[color:var(--screen)]">
      {tint && <path d="M2 10a8 8 0 0 1 16 0z" fill={tint} fillOpacity="0.55" />}
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 10h16" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function BallLayer({ balls, tints, calm }: { balls: Ball[]; tints?: string[]; calm?: boolean }) {
  return (
    <>
      {balls.map((b, i) => (
        <span
          key={i}
          className="bg-float absolute"
          style={{
            left: `${b.l}%`, top: `${b.t}%`,
            ["--dur" as string]: `${b.dur * (calm ? 1.8 : 1)}s`, ["--delay" as string]: `${b.delay}s`,
            ["--dx" as string]: `${b.dx}px`, ["--dy" as string]: `${b.dy}px`, ["--rot" as string]: `${b.rot}deg`,
          }}
        >
          <PokeBallShape size={b.s} opacity={b.o} tint={tints ? tints[i % tints.length] : undefined} />
        </span>
      ))}
    </>
  );
}
const CARDS = [
  { l: 6,  t: 12, w: 78, dur: 30, delay: -4,  dx: 16,  dy: -34, rot: -14 },
  { l: 22, t: 62, w: 64, dur: 34, delay: -10, dx: -14, dy: -28, rot: 10 },
  { l: 40, t: 8,  w: 56, dur: 28, delay: -7,  dx: 12,  dy: -30, rot: 18 },
  { l: 58, t: 70, w: 84, dur: 36, delay: -2,  dx: -18, dy: -40, rot: -8 },
  { l: 74, t: 20, w: 70, dur: 32, delay: -12, dx: 14,  dy: -32, rot: 12 },
  { l: 90, t: 58, w: 60, dur: 29, delay: -6,  dx: -12, dy: -26, rot: -16 },
  { l: 48, t: 40, w: 52, dur: 38, delay: -15, dx: 10,  dy: -24, rot: 6 },
];

const STREAKS = Array.from({ length: 10 }, (_, i) => ({
  t: 6 + i * 9.3, w: 140 + ((i * 53) % 200), dur: 2.4 + (i % 4) * 0.7, delay: -(i * 0.8), o: 0.18 + (i % 3) * 0.08,
}));

const EMBERS = Array.from({ length: 24 }, (_, i) => ({
  l: (i * 37 + 11) % 100, s: 3 + (i % 4) * 2, dur: 9 + ((i * 7) % 9), delay: -((i * 5) % 14), dx: ((i % 5) - 2) * 18, o: 0.35 + (i % 3) * 0.15,
}));

const RETICLE_STYLE = { stroke: "var(--bg-accent)", strokeOpacity: 0.3 } as const;

const RAIN = Array.from({ length: 46 }, (_, i) => ({
  l: (i * 23 + 7) % 100, h: 50 + ((i * 17) % 70), dur: 0.9 + (i % 5) * 0.2, delay: -((i % 9) * 0.35), o: 0.25 + (i % 3) * 0.12,
}));
const SNOW = Array.from({ length: 36 }, (_, i) => ({
  l: (i * 29 + 5) % 100, s: 3 + (i % 4) * 1.5, dur: 9 + ((i * 5) % 9), delay: -((i * 3) % 14), dx: ((i % 5) - 2) * 14, o: 0.45 + (i % 3) * 0.15,
}));
const SAND = Array.from({ length: 30 }, (_, i) => ({
  t: (i * 13 + 5) % 100, w: 40 + ((i * 31) % 90), dur: 2.4 + (i % 5) * 0.6, delay: -((i * 7) % 9) * 0.5, dy: ((i % 5) - 2) * 10, o: 0.25 + (i % 3) * 0.12,
}));
const TERRAIN_COLOR = { electric: "#facc15", grassy: "#4ade80", misty: "#f9a8d4", psychic: "#c084fc" } as const;
const FIELD_FADE = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.7 } };

function BattleFieldMotif() {
  const { weather, terrain, trickRoomTurnsLeft, tailwindTurnsLeft } = useBattleSessionStore((s) => s.fieldState);
  const emberCount = weather === "rain" || weather === "snow" ? 6 : weather === "sand" ? 12 : 24;
  const tailwind = tailwindTurnsLeft.yours > 0 || tailwindTurnsLeft.opponents > 0;

  return (
    <>
      {EMBERS.slice(0, emberCount).map((e, i) => (
        <span
          key={i}
          className="bg-ember absolute rounded-full"
          style={{
            left: `${e.l}%`, bottom: -10, width: e.s, height: e.s,
            background: "var(--bg-accent)", boxShadow: "0 0 8px var(--bg-accent)",
            ["--dur" as string]: `${e.dur}s`, ["--delay" as string]: `${e.delay}s`,
            ["--dx" as string]: `${e.dx}px`, ["--o" as string]: `${e.o}`,
          }}
        />
      ))}

      <AnimatePresence>
        {terrain !== "none" && (
          <motion.div key={`terrain-${terrain}`} className="absolute inset-0" {...FIELD_FADE}>
            <div
              className="bg-pulse absolute inset-x-0 bottom-0 h-[34%]"
              style={{
                ["--dur" as string]: "4s",
                background: `linear-gradient(to top, color-mix(in srgb, ${TERRAIN_COLOR[terrain]} 38%, transparent), transparent)`,
              }}
            />
          </motion.div>
        )}

        {trickRoomTurnsLeft > 0 && (
          <motion.div key="trick-room" className="absolute inset-0" {...FIELD_FADE}>
            <div
              className="absolute"
              style={{ left: "50%", top: "46%", width: "clamp(360px, 50vw, 700px)", aspectRatio: "1", transform: "translate(-50%, -50%)" }}
            >
              <div className="bg-spin absolute inset-0" style={{ ["--dur" as string]: "60s", animationDirection: "reverse" }}>
                <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" style={{ stroke: "#c084fc", strokeOpacity: 0.35 }}>
                  <circle cx="100" cy="100" r="96" strokeWidth="1.2" strokeDasharray="3 6" />
                  <circle cx="100" cy="100" r="70" strokeWidth="1.2" strokeDasharray="10 8" />
                  <circle cx="100" cy="100" r="44" strokeWidth="1.2" strokeDasharray="2 5" />
                </svg>
              </div>
            </div>
          </motion.div>
        )}

        {tailwind && (
          <motion.div key="tailwind" className="absolute inset-0" {...FIELD_FADE}>
            {STREAKS.slice(0, 7).map((s, i) => (
              <span
                key={i}
                className="bg-streak absolute"
                style={{
                  top: `${s.t}%`, left: 0, width: s.w, height: 2, borderRadius: 2,
                  background: "linear-gradient(90deg, transparent, #7dd3fc)",
                  ["--dur" as string]: `${s.dur}s`, ["--delay" as string]: `${s.delay}s`, ["--o" as string]: `${s.o}`,
                }}
              />
            ))}
          </motion.div>
        )}

        {weather === "sun" && (
          <motion.div key="sun" className="absolute inset-0" {...FIELD_FADE}>
            <div className="absolute" style={{ right: "-12%", top: "-18%", width: "clamp(420px, 56vw, 780px)", aspectRatio: "1" }}>
              <div
                className="bg-spin absolute inset-0 rounded-full"
                style={{
                  ["--dur" as string]: "120s",
                  background: "repeating-conic-gradient(from 0deg, rgba(255,199,44,0.20) 0 6deg, transparent 6deg 18deg)",
                  maskImage: "radial-gradient(circle, black 15%, transparent 70%)",
                  WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 70%)",
                }}
              />
              <div
                className="bg-pulse absolute inset-[30%] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(255,199,44,0.55), transparent 70%)" }}
              />
            </div>
          </motion.div>
        )}

        {weather === "rain" && (
          <motion.div key="rain" className="absolute inset-0 overflow-hidden" {...FIELD_FADE}>
            <div className="absolute inset-0" style={{ background: "rgba(59,130,246,0.08)" }} />
            <div className="absolute -inset-[20%]" style={{ transform: "rotate(10deg)" }}>
              {RAIN.map((d, i) => (
                <span
                  key={i}
                  className="bg-rain absolute"
                  style={{
                    left: `${d.l}%`, top: 0, width: 2, height: d.h, borderRadius: 2,
                    background: "linear-gradient(to bottom, transparent, #7dd3fc)",
                    ["--dur" as string]: `${d.dur}s`, ["--delay" as string]: `${d.delay}s`, ["--o" as string]: `${d.o}`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {weather === "snow" && (
          <motion.div key="snow" className="absolute inset-0 overflow-hidden" {...FIELD_FADE}>
            <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.04)" }} />
            {SNOW.map((f, i) => (
              <span
                key={i}
                className="bg-snow absolute rounded-full bg-white"
                style={{
                  left: `${f.l}%`, top: 0, width: f.s, height: f.s,
                  ["--dur" as string]: `${f.dur}s`, ["--delay" as string]: `${f.delay}s`,
                  ["--dx" as string]: `${f.dx}px`, ["--o" as string]: `${f.o}`,
                }}
              />
            ))}
          </motion.div>
        )}

        {weather === "sand" && (
          <motion.div key="sand" className="absolute inset-0 overflow-hidden" {...FIELD_FADE}>
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(217,180,106,0.18), transparent 60%)" }} />
            {SAND.map((s, i) => (
              <span
                key={i}
                className="bg-sand absolute"
                style={{
                  top: `${s.t}%`, left: 0, width: s.w, height: 2, borderRadius: 2,
                  background: "linear-gradient(90deg, transparent, #d9b46a)",
                  ["--dur" as string]: `${s.dur}s`, ["--delay" as string]: `${s.delay}s`,
                  ["--dy" as string]: `${s.dy}px`, ["--o" as string]: `${s.o}`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const PIP = "clamp(12px, 1.7vw, 24px)";
const SPARK_ANGLES = Array.from({ length: 6 }, (_, i) => (i * Math.PI * 2) / 6 + 0.3);

function TeamPip({ slot, types, burst }: { slot: number; types?: PokemonTypeName[]; burst: boolean }) {
  const top = types ? TYPE_COLOR[types[0]] : null;
  const bottom = types?.[1] ? TYPE_COLOR[types[1]] : null;

  return (
    <span className="relative block" style={{ width: PIP, height: PIP }}>
      {/* keyed on the types so the pop animation replays whenever the slot's Pokémon changes */}
      <motion.span
        key={types ? types.join("-") : "empty"}
        className="block h-full w-full"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: types ? 0.8 : 0.2 }}
        transition={{ type: "spring", stiffness: 380, damping: 16 }}
        style={types ? { filter: `drop-shadow(0 0 6px ${top})` } : undefined}
      >
        <span
          className={`block h-full w-full ${types ? "bg-pulse" : ""}`}
          style={{ ["--dur" as string]: `${3 + slot * 0.3}s` }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full text-[color:var(--screen)]" fill="none">
            {top && <path d="M2 10a8 8 0 0 1 16 0z" fill={top} fillOpacity="0.85" />}
            {bottom && <path d="M2 10a8 8 0 0 0 16 0z" fill={bottom} fillOpacity="0.85" />}
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2 10h16" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </span>
      </motion.span>

      {burst &&
        top &&
        SPARK_ANGLES.map((a, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
            style={{ marginLeft: -3, marginTop: -3, background: top, boxShadow: `0 0 6px ${top}` }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
            animate={{ x: Math.cos(a) * 34, y: Math.sin(a) * 34, opacity: [0, 1, 0], scale: 0.3 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: slot * 0.1, times: [0, 0.15, 1] }}
          />
        ))}
    </span>
  );
}

function TeamRails() {
  const slots = useTeamStore((s) => s.slots);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false); // persisted store: avoid a hydration mismatch
  const pips = slots.map((s) => (mounted && s.pokemon ? s.pokemon.types : undefined));
  const complete = pips.length === 6 && pips.every(Boolean);
  const line = complete
    ? "color-mix(in srgb, var(--accent-gold) 70%, transparent)"
    : "color-mix(in srgb, var(--screen) 22%, transparent)";

  return (
    <MotionConfig reducedMotion="user">
      {(["left", "right"] as const).map((side, r) => (
        <div
          key={side}
          className="absolute flex flex-col items-center"
          style={{ [side]: "clamp(2px, 0.6vw, 14px)", top: "30%", width: PIP, gap: "clamp(14px, 3.2vh, 34px)" }}
        >
          <span className="absolute inset-y-2 left-1/2 w-px transition-colors duration-700" style={{ background: line }} />
          {pips.slice(r * 3, r * 3 + 3).map((types, i) => (
            <TeamPip key={r * 3 + i} slot={r * 3 + i} types={types} burst={complete} />
          ))}
        </div>
      ))}
    </MotionConfig>
  );
}

const SIGNAL_FADE = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.6 } };

// ---- Speed Check: streaks follow the verdict ----
const SPEED_LOOK = {
  even: { color: "var(--bg-accent)", dur: 1,   o: 1,   w: 1,   glow: false },
  fast: { color: "#ffc72c",          dur: 0.5, o: 1.8, w: 1.5, glow: true  },
  slow: { color: "#ef4444",          dur: 1.9, o: 0.9, w: 0.6, glow: false },
} as const;

function SpeedStreaks() {
  const chance = useBackdropStore((s) => s.speedChance);
  const mood: keyof typeof SPEED_LOOK = chance === null || (chance > 40 && chance < 60) ? "even" : chance >= 60 ? "fast" : "slow";
  const look = SPEED_LOOK[mood];

  return (
    <AnimatePresence>
      <motion.div key={mood} className="absolute inset-0" {...SIGNAL_FADE}>
        {mood === "fast" && (
          <div className="absolute inset-y-0 right-0 w-1/3" style={{ background: "linear-gradient(to left, rgba(255,199,44,0.22), transparent)" }} />
        )}
        {mood === "slow" && (
          <div className="absolute inset-y-0 left-0 w-1/3" style={{ background: "linear-gradient(to right, rgba(239,68,68,0.18), transparent)" }} />
        )}
        {STREAKS.map((s, i) => (
          <span
            key={i}
            className="bg-streak absolute"
            style={{
              top: `${s.t}%`, left: 0, width: s.w * look.w, height: 2, borderRadius: 2,
              background: `linear-gradient(90deg, transparent, ${look.color})`,
              boxShadow: look.glow ? `0 0 8px ${look.color}` : undefined,
              ["--dur" as string]: `${s.dur * look.dur}s`, ["--delay" as string]: `${s.delay}s`,
              ["--o" as string]: `${Math.min(0.9, s.o * look.o)}`,
            }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

// ---- Damage Check: reticle locks on and ripples when a result appears ----
const DAMAGE_COLOR = { ko: "#ef4444", hit: "#ffc72c", immune: "#94a3b8" } as const;
const RETICLE_SIZE = "clamp(260px, 34vw, 520px)";

function DamageGridMotif() {
  const damage = useBackdropStore((s) => s.damage);
  const color = damage ? DAMAGE_COLOR[damage.kind] : null;
  const fade = "radial-gradient(ellipse at center, black 30%, transparent 75%)";
  const gridLines = (c: string) =>
    `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: gridLines("color-mix(in srgb, var(--screen) 6%, transparent)"),
          backgroundSize: "48px 48px", maskImage: fade, WebkitMaskImage: fade,
        }}
      />

      <AnimatePresence>
        {damage && color && (
          <motion.div
            key={`grid-${damage.key}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, times: [0, 0.2, 1] }}
            style={{
              backgroundImage: gridLines(`color-mix(in srgb, ${color} 30%, transparent)`),
              backgroundSize: "48px 48px", maskImage: fade, WebkitMaskImage: fade,
            }}
          />
        )}
        {damage?.kind === "ko" && (
          <motion.div
            key={`ko-${damage.key}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0.1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, times: [0, 0.15, 1] }}
            style={{ background: "radial-gradient(ellipse at 78% 50%, rgba(239,68,68,0.6), transparent 65%)" }}
          />
        )}
      </AnimatePresence>

      <div className="absolute" style={{ right: "4%", top: "50%", width: RETICLE_SIZE, aspectRatio: "1", transform: "translateY(-50%)" }}>
        <AnimatePresence>
          {!damage && (
            <motion.div key="idle" className="absolute inset-0" {...SIGNAL_FADE}>
              <div className="bg-spin h-full w-full" style={{ ["--dur" as string]: "120s" }}>
                <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" style={RETICLE_STYLE}>
                  <circle cx="100" cy="100" r="90" strokeWidth="1" />
                  <circle cx="100" cy="100" r="58" strokeWidth="1" strokeDasharray="6 6" />
                  <path d="M100 0v40M100 160v40M0 100h40M160 100h40" strokeWidth="1.2" />
                </svg>
              </div>
            </motion.div>
          )}
          {damage && color && (
            <motion.div
              key={`lock-${damage.kind}`}
              className="absolute inset-0"
              initial={{ scale: 1.45, opacity: 0, rotate: 35 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 16 }}
            >
              <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" style={{ stroke: color, strokeOpacity: 0.55 }}>
                <circle cx="100" cy="100" r="90" strokeWidth="1.5" />
                <circle cx="100" cy="100" r="58" strokeWidth="1.5" />
                <path d="M100 0v40M100 160v40M0 100h40M160 100h40" strokeWidth="2" />
                <circle cx="100" cy="100" r="5" fill={color} fillOpacity="0.8" stroke="none" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {damage && color &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={`${damage.key}-${i}`}
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${color}` }}
              initial={{ scale: 0.25, opacity: 0.6 }}
              animate={{ scale: 3.2, opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut", delay: i * 0.35 }}
            />
          ))}
      </div>
    </MotionConfig>
  );
}

function MotifLayer({ motif }: { motif: SceneMotif }) {
  switch (motif) {
    case "cards":
      return (
        <>
          {CARDS.map((c, i) => (
            <span
              key={i}
              className="bg-float absolute rounded-xl border-2"
              style={{
                left: `${c.l}%`, top: `${c.t}%`, width: c.w, aspectRatio: "5 / 7",
                borderColor: "color-mix(in srgb, var(--screen) 22%, transparent)",
                background: "linear-gradient(160deg, color-mix(in srgb, var(--bg-accent) 22%, transparent), transparent 70%)",
                ["--dur" as string]: `${c.dur}s`, ["--delay" as string]: `${c.delay}s`,
                ["--dx" as string]: `${c.dx}px`, ["--dy" as string]: `${c.dy}px`, ["--rot" as string]: `${c.rot}deg`,
              }}
            >
              <span
                className="absolute inset-x-1.5 top-1.5 h-[46%] rounded-md"
                style={{ border: "1.5px solid color-mix(in srgb, var(--screen) 18%, transparent)" }}
              />
            </span>
          ))}
          <TeamRails />
        </>
      );

    case "versus":
      return (
        <>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: "repeating-linear-gradient(115deg, transparent 0 56px, color-mix(in srgb, var(--screen) 5%, transparent) 56px 58px)" }}
          />
          <span className="absolute" style={{ left: "50%", top: "46%", transform: "translate(-50%, -50%) rotate(-8deg)" }}>
            <span
              className="bg-float font-logo block select-none"
              style={{
                fontSize: "clamp(160px, 26vw, 380px)", lineHeight: 1,
                color: "color-mix(in srgb, var(--bg-accent) 14%, transparent)",
                ["--dx" as string]: "0px", ["--dy" as string]: "-24px", ["--rot" as string]: "3deg", ["--dur" as string]: "18s",
              }}
            >
              VS
            </span>
          </span>
        </>
      );

    case "rings":
      return (
        <div className="absolute" style={{ right: "-10%", top: "50%", width: "clamp(420px, 62vw, 860px)", aspectRatio: "1", transform: "translateY(-50%)" }}>
          <div className="bg-spin absolute inset-0" style={{ ["--dur" as string]: "140s" }}>
            <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" style={RETICLE_STYLE}>
              <circle cx="100" cy="100" r="96" strokeWidth="0.8" strokeDasharray="2 5" />
              <circle cx="100" cy="100" r="76" strokeWidth="0.8" />
              <circle cx="100" cy="100" r="56" strokeWidth="0.8" strokeDasharray="10 6" />
              <path d="M100 4v192M4 100h192" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="bg-spin absolute inset-[26%]" style={{ ["--dur" as string]: "90s", animationDirection: "reverse" }}>
            <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" style={RETICLE_STYLE}>
              <circle cx="100" cy="100" r="96" strokeWidth="1" strokeDasharray="4 8" />
              <circle cx="100" cy="100" r="48" strokeWidth="1" />
            </svg>
          </div>
        </div>
      );

    case "speedlines":
      return <SpeedStreaks />;

    case "embers":
      return <BattleFieldMotif />;

    case "grid":
      return <DamageGridMotif />;

    case "arena": {
      const you = "var(--shell-accent)";
      const opp = "#3b82f6";
      const beam = "linear-gradient(to bottom, color-mix(in srgb, var(--screen) 15%, transparent), transparent 80%)";
      return (
        <>
          {/* red light on your side, blue on the opponent's */}
          <div
            className="absolute inset-0"
            style={{
              background:
                `radial-gradient(60% 75% at 0% 90%, color-mix(in srgb, ${you} 36%, transparent), transparent 70%), ` +
                `radial-gradient(60% 75% at 100% 90%, color-mix(in srgb, ${opp} 36%, transparent), transparent 70%)`,
            }}
          />
          {/* stadium spotlights */}
          <div className="absolute inset-0" style={{ clipPath: "polygon(8% 0, 22% 0, 30% 100%, 0 100%)", background: beam }} />
          <div className="absolute inset-0" style={{ clipPath: "polygon(78% 0, 92% 0, 100% 100%, 70% 100%)", background: beam }} />

          {/* battlefield floor in perspective, with a Poké Ball-style center mark */}
          <div className="absolute inset-x-0 bottom-0 h-[40%]" style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.38))" }}>
            <svg viewBox="0 0 1000 380" preserveAspectRatio="none" className="h-full w-full" fill="none">
              <g style={{ stroke: "var(--screen)", strokeOpacity: 0.14 }} strokeWidth="1">
                {ARENA_COLS.map((xb) => (
                  <line key={xb} x1={arenaVp(xb)} y1="0" x2={xb} y2="380" vectorEffect="non-scaling-stroke" />
                ))}
                {ARENA_ROWS.map((y) => (
                  <line key={y} x1="0" y1={y} x2="1000" y2={y} vectorEffect="non-scaling-stroke" />
                ))}
              </g>
              <g style={{ stroke: "var(--bg-accent)", strokeOpacity: 0.4 }} strokeWidth="1.5">
                <ellipse cx="500" cy="215" rx="300" ry="62" vectorEffect="non-scaling-stroke" />
                <ellipse cx="500" cy="215" rx="46" ry="11" vectorEffect="non-scaling-stroke" />
                <line x1="200" y1="215" x2="800" y2="215" vectorEffect="non-scaling-stroke" />
              </g>
            </svg>
          </div>

          {/* trainer platforms under each side's silhouette */}
          {(["left", "right"] as const).map((side) => {
            const c = side === "left" ? you : opp;
            return (
              <div
                key={side}
                className="absolute rounded-[50%]"
                style={{
                  [side]: "-3%", bottom: "-1.5%", width: DEFAULT_FIGURE, height: "clamp(50px, 7vw, 100px)",
                  background: `radial-gradient(closest-side, color-mix(in srgb, ${c} 45%, transparent), transparent 75%)`,
                  border: `2px solid color-mix(in srgb, ${c} 55%, transparent)`,
                }}
              />
            );
          })}

          {/* clash burst + VS */}
          <div className="absolute" style={{ left: "50%", top: "44%", transform: "translate(-50%, -50%)" }}>
            <div className="bg-pulse relative" style={{ width: "clamp(180px, 22vw, 320px)", aspectRatio: "1" }}>
              <svg viewBox="-100 -100 200 200" className="absolute inset-0 h-full w-full">
                <polygon points={BURST_POINTS} style={{ fill: "var(--bg-accent)", fillOpacity: 0.16 }} />
              </svg>
              <ArenaFlare />
              <span
                className="font-logo absolute inset-0 flex select-none items-center justify-center"
                style={{ fontSize: "clamp(56px, 8vw, 120px)", color: "color-mix(in srgb, var(--screen) 22%, transparent)" }}
              >
                VS
              </span>
            </div>
          </div>

          {/* sparks from the middle of the field */}
          {EMBERS.slice(0, 12).map((e, i) => {
            const c = i % 2 ? opp : you;
            return (
              <span
                key={i}
                className="bg-ember absolute rounded-full"
                style={{
                  left: `${36 + (e.l % 28)}%`, bottom: "14%", width: e.s, height: e.s,
                  background: c, boxShadow: `0 0 8px ${c}`,
                  ["--dur" as string]: `${e.dur}s`, ["--delay" as string]: `${e.delay}s`,
                  ["--dx" as string]: `${e.dx}px`, ["--o" as string]: `${e.o}`,
                }}
              />
            );
          })}

          {/* a Poké Ball in the air on each side (pixel sprite from PokeAPI) */}
          {(["left", "right"] as const).map((side) => {
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={side}
                src={`${SPRITE}/poke-ball.png`}
                alt=""
                className="bg-float absolute"
                style={{
                  [side]: "27%", top: "30%", width: 56, height: 56, imageRendering: "pixelated", opacity: 0.35,
                  ["--dx" as string]: side === "left" ? "18px" : "-18px", ["--dy" as string]: "-22px",
                  ["--rot" as string]: side === "left" ? "14deg" : "-14deg", ["--dur" as string]: "9s",
                }}
              />
            );
          })}
          <ArenaRails />
        </>
      );
    }

    case "timeline":
      return <TimelineMotif />;

    case "machinery":
      return <MachineryMotif />;

    default:
      return null; // "balls" / "ballTypes" are handled by BallLayer
  }
}

// ---- Settings: machinery reacts to the model test ----
function MachineryMotif() {
  const status = useBackdropStore((s) => s.aiTest);
  const busy = status === "loading";
  const flash = status === "ok" ? "#10b981" : status === "fail" ? "#ef4444" : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="absolute inset-0" style={{ ["--g" as string]: "clamp(170px, 24vw, 340px)" }}>
        <div className="absolute" style={{ left: "-5%", bottom: "8%", width: "var(--g)", height: "var(--g)" }}>
          <Gear dur={80} />
        </div>
        <div
          className="absolute"
          style={{ left: "calc(-5% + var(--g) * 0.62)", bottom: "calc(8% + var(--g) * 0.62)", width: "var(--g)", height: "var(--g)" }}
        >
          <Gear dur={80} reverse offset={15} />
        </div>
        <div className="absolute" style={{ right: "-6%", top: "6%", width: "calc(var(--g) * 1.25)", height: "calc(var(--g) * 1.25)" }}>
          <Gear dur={110} reverse offset={7} />
        </div>

        {FADERS.map((f, i) => (
          <span
            key={i}
            className="absolute"
            style={{ left: `${f.l}%`, bottom: "3%", width: 2, height: f.h, background: "color-mix(in srgb, var(--screen) 22%, transparent)" }}
          >
            <span
              key={busy ? "busy" : "idle"} // remounting restarts the animation at the new speed
              className="bg-fader absolute rounded-sm"
              style={{
                left: -6, bottom: 0, width: 14, height: 8, background: "var(--bg-accent)", opacity: busy ? 0.9 : 0.55,
                ["--travel" as string]: `${-(f.h - 8)}px`,
                ["--dur" as string]: `${busy ? f.dur * 0.25 : f.dur}s`,
                ["--delay" as string]: `${f.delay}s`,
              }}
            />
          </span>
        ))}

        {flash && (
          <motion.div
            key={status}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.45, 0] }}
            transition={{ duration: 1.6, times: [0, 0.2, 1] }}
            style={{ background: `radial-gradient(ellipse at 50% 50%, ${flash}, transparent 70%)` }}
          />
        )}
      </div>
    </MotionConfig>
  );
}

// ---- Optimizer: VS flare on ranking changes + scouting rails ----
const ARENA_SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI * 2) / 12 + 0.2;
  const d = 90 + (i % 3) * 35;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, c: i % 2 ? "#3b82f6" : "var(--shell-accent)" };
});

function ArenaFlare() {
  const rankKey = useBackdropStore((s) => s.rankKey);
  if (!rankKey) return null;
  return (
    <MotionConfig reducedMotion="user">
      <motion.div key={rankKey} className="pointer-events-none absolute inset-0">
        <motion.svg
          viewBox="-100 -100 200 200"
          className="absolute inset-0 h-full w-full"
          initial={{ scale: 0.7, opacity: 0.9 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <polygon points={BURST_POINTS} style={{ fill: "var(--bg-accent)", fillOpacity: 0.5 }} />
        </motion.svg>
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: "3px solid var(--bg-accent)" }}
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
        {ARENA_SPARKS.map((s, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
            style={{ marginLeft: -4, marginTop: -4, background: s.c, boxShadow: `0 0 8px ${s.c}` }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: s.x, y: s.y, opacity: [0, 1, 0] }}
            transition={{ duration: 1.1, ease: "easeOut", times: [0, 0.15, 1] }}
          />
        ))}
      </motion.div>
    </MotionConfig>
  );
}

function ArenaPip({ color, lit, i }: { color: string; lit: boolean; i: number }) {
  return (
    <motion.span
      className="block"
      style={{ width: PIP, height: PIP, filter: lit ? `drop-shadow(0 0 6px ${color})` : undefined }}
      animate={{ scale: lit ? 1 : 0.8, opacity: lit ? 0.9 : 0.2 }}
      transition={{ type: "spring", stiffness: 380, damping: 16, delay: lit ? i * 0.08 : 0 }}
    >
      <svg viewBox="0 0 20 20" className="h-full w-full text-[color:var(--screen)]" fill="none">
        {lit && <path d="M2 10a8 8 0 0 1 16 0z" style={{ fill: color, fillOpacity: 0.9 }} />}
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2 10h16" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </motion.span>
  );
}

function ArenaRails() {
  const figures = useBackdropStore((s) => s.figures);
  const counts = {
    left: figures.filter((f) => f.side === "left").length,
    right: figures.filter((f) => f.side === "right").length,
  };
  return (
    <MotionConfig reducedMotion="user">
      {(["left", "right"] as const).map((side) => {
        const color = side === "left" ? "var(--shell-accent)" : "#3b82f6";
        return (
          <div
            key={side}
            className="absolute flex flex-col items-center"
            style={{ [side]: "clamp(2px, 0.6vw, 14px)", top: "22%", width: PIP, gap: "clamp(10px, 2.4vh, 26px)" }}
          >
            <span className="absolute inset-y-2 left-1/2 w-px" style={{ background: `color-mix(in srgb, ${color} 45%, transparent)` }} />
            {Array.from({ length: 6 }, (_, i) => (
              <ArenaPip key={i} i={i} color={color} lit={i < counts[side]} />
            ))}
          </div>
        );
      })}
    </MotionConfig>
  );
}

// ---- Pokédex: radar sweep + blip per pick ----
function DexRadar() {
  const ping = useBackdropStore((s) => s.dexPing);
  const color = ping ? TYPE_COLOR[ping.type] : null;
  const n = ping?.n ?? 0;
  const ang = (((n * 137.5) % 360) * Math.PI) / 180;
  const r = 20 + ((n * 37) % 26);
  const x = 50 + Math.cos(ang) * r;
  const y = 50 + Math.sin(ang) * r;
  const blipBase = { left: `${x}%`, top: `${y}%`, marginLeft: -5, marginTop: -5, width: 10, height: 10 } as const;

  return (
    <MotionConfig reducedMotion="user">
      <div className="absolute" style={{ right: "-4%", top: "8%", width: "clamp(220px, 24vw, 360px)", aspectRatio: "1" }}>
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" fill="none" style={RETICLE_STYLE}>
          <circle cx="100" cy="100" r="96" strokeWidth="1" />
          <circle cx="100" cy="100" r="64" strokeWidth="0.8" strokeDasharray="4 6" />
          <circle cx="100" cy="100" r="32" strokeWidth="0.8" />
          <path d="M100 4v192M4 100h192" strokeWidth="0.5" />
        </svg>
        <div
          className="bg-spin absolute inset-0 rounded-full"
          style={{
            ["--dur" as string]: "7s",
            background: "conic-gradient(from 0deg, transparent 0deg 285deg, color-mix(in srgb, var(--bg-accent) 50%, transparent) 360deg)",
          }}
        />
        {ping && color && (
          <>
            <motion.span
              key={`blip-${ping.n}`}
              className="absolute rounded-full"
              style={{ ...blipBase, background: color, boxShadow: `0 0 12px ${color}` }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.4, 1, 1], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 4, times: [0, 0.08, 0.2, 1], ease: "easeOut" }}
            />
            {[0, 1].map((i) => (
              <motion.span
                key={`ring-${ping.n}-${i}`}
                className="absolute rounded-full"
                style={{ ...blipBase, border: `2px solid ${color}` }}
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 5, opacity: 0 }}
                transition={{ duration: 1.8, ease: "easeOut", delay: i * 0.5 }}
              />
            ))}
          </>
        )}
      </div>
    </MotionConfig>
  );
}

// ---- Items: twinkles around the silhouette + rolling balls along the bottom ----
const GLINTS = [
  { x: 22, y: 28, s: 18, dur: 3.2, delay: 0 },
  { x: 70, y: 18, s: 14, dur: 2.6, delay: -1.1 },
  { x: 82, y: 52, s: 20, dur: 3.8, delay: -2 },
  { x: 14, y: 62, s: 12, dur: 2.9, delay: -0.6 },
  { x: 48, y: 40, s: 16, dur: 3.5, delay: -1.8 },
  { x: 60, y: 76, s: 12, dur: 2.4, delay: -2.4 },
];

function ItemGlints({ side, size }: { side: "left" | "right"; size: string }) {
  return (
    <div className="absolute bottom-0" style={{ [side]: "-3%", width: size, height: size }}>
      {GLINTS.map((g, i) => (
        <span
          key={i}
          className="bg-twinkle absolute"
          style={{
            left: `${g.x}%`, top: `${g.y}%`, width: g.s, height: g.s,
            ["--dur" as string]: `${g.dur}s`, ["--delay" as string]: `${g.delay}s`,
          }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full" style={{ fill: "#fff6d6", filter: "drop-shadow(0 0 4px #ffc72c)" }}>
            <path d="M10 0Q10 10 20 10Q10 10 10 20Q10 10 0 10Q10 10 10 0Z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

const ROLLERS = [
  { s: 34, dur: 58, delay: 0 },
  { s: 26, dur: 72, delay: -19 },
  { s: 40, dur: 66, delay: -38 },
  { s: 30, dur: 80, delay: -52 },
  { s: 36, dur: 62, delay: -27 },
];

function RollingBalls() {
  return (
    <div className="absolute inset-x-0 bottom-[5.5rem] h-12 lg:bottom-2">
      {ROLLERS.map((b, i) => (
        <span
          key={i}
          className="bg-roll absolute bottom-0 left-0"
          style={{
            ["--dur" as string]: `${b.dur}s`, ["--delay" as string]: `${b.delay}s`,
            ["--turn" as string]: `${Math.round((1700 / (Math.PI * b.s)) * 360)}deg`,
          }}
        >
          <PokeBallShape size={b.s} opacity={0.14} tint={BALL_TINTS[i % BALL_TINTS.length]} />
        </span>
      ))}
    </div>
  );
}

const DEFAULT_FIGURE = "clamp(240px, 36vw, 500px)";

// Official art mostly faces left. If a Pokémon's art faces right, add its dex number here
// so it still turns toward the other side.
const FACES_RIGHT = new Set<number>([]);
const artId = (src: string) => Number(src.match(/\/(\d+)\.png/)?.[1] ?? 0);
const flipFor = (side: "left" | "right", src: string) => (side === "left") !== FACES_RIGHT.has(artId(src));

function SideSilhouette({ side, src, color, size, flip }: {
  side: "left" | "right"; src: string; color: string; size: string; flip: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: "easeInOut" }}
    >
      <div
        className="absolute bottom-0"
        style={{
          ...maskStyle(src, color, size),
          [side]: "-3%",
          opacity: SILHOUETTE_OPACITY,
          transform: flip ? "scaleX(-1)" : undefined,
        }}
      />
    </motion.div>
  );
}

// ---- Arena (Battle Optimizer) ----
const ARENA_COLS = [-480, -320, -160, 0, 160, 320, 480, 640, 800, 960, 1120, 1280, 1440];
const ARENA_ROWS = [34, 82, 142, 218, 316];
const arenaVp = (xb: number) => 500 + (xb - 500) * 0.40625; // converge toward a vanishing point above the floor
const BURST_POINTS = Array.from({ length: 24 }, (_, i) => {
  const a = (i * Math.PI) / 12;
  const r = i % 2 === 0 ? 96 : 44;
  return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
}).join(" ");
const SPRITE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";

// ---- Timeline (Battle History) ----
function TimelineMotif() {
  const entries = useBattleHistoryStore((s) => s.entries);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const rows = Array.from({ length: MAX_BATTLE_HISTORY }, (_, i) => (mounted ? entries[i] : undefined));

  return (
    <>
      {(["left", "right"] as const).map((side, s) => (
        <div key={side} className="absolute inset-y-0" style={{ [side]: "2.5%", width: 14 }}>
          <div
            className="absolute inset-y-[6%] left-1/2 w-px"
            style={{ background: "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--screen) 28%, transparent) 12%, color-mix(in srgb, var(--screen) 28%, transparent) 88%, transparent)" }}
          />
          {rows.map((e, i) => {
            const color = e ? (e.outcome === "win" ? "#10b981" : "#ef4444") : null;
            return (
              <span
                key={i}
                className="absolute left-1/2 rounded-full"
                style={{
                  top: `${8 + i * 9.3}%`, width: 12, height: 12, transform: "translate(-50%, -50%)",
                  border: `2px solid ${color ?? "color-mix(in srgb, var(--screen) 22%, transparent)"}`,
                  background: color ? `color-mix(in srgb, ${color} 55%, transparent)` : "transparent",
                  boxShadow: color ? `0 0 10px ${color}` : undefined,
                }}
              />
            );
          })}
          <span
            className="bg-scan absolute"
            style={{
              left: -4, right: -4, height: 90,
              background: "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--bg-accent) 70%, transparent), transparent)",
              ["--dur" as string]: "8s", ["--delay" as string]: `${-s * 4}s`,
            }}
          />
        </div>
      ))}
    </>
  );
}

// ---- Machinery (Settings) ----
function gearPath(teeth: number, outer: number, inner: number): string {
  const step = (Math.PI * 2) / teeth;
  const p = (ang: number, r: number) => `${(Math.cos(ang) * r).toFixed(2)},${(Math.sin(ang) * r).toFixed(2)}`;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(p(a - step * 0.28, inner), p(a - step * 0.16, outer), p(a + step * 0.16, outer), p(a + step * 0.28, inner));
  }
  return `M${pts.join("L")}Z`;
}
const GEAR_D = gearPath(12, 96, 80);

function Gear({ dur, reverse, offset = 0 }: { dur: number; reverse?: boolean; offset?: number }) {
  const busy = useBackdropStore((s) => s.aiTest === "loading");
  const reduceMotion = useReducedMotion();
  const rotate = useMotionValue(0);
  const boost = useRef(1);
  const degPerSec = (360 / dur) * (reverse ? -1 : 1);

  useAnimationFrame((_, delta) => {
    if (reduceMotion) return;
    const dt = Math.min(delta, 100); // ignore the huge gap after a hidden tab
    boost.current += ((busy ? 14 : 1) - boost.current) * Math.min(1, dt / 350);
    rotate.set(rotate.get() + degPerSec * boost.current * (dt / 1000));
  });

  return (
    <div className="h-full w-full" style={{ transform: `rotate(${offset}deg)` }}>
      <motion.div className="h-full w-full" style={{ rotate }}>
        <svg viewBox="-100 -100 200 200" className="h-full w-full" fill="none" style={RETICLE_STYLE}>
          <path d={GEAR_D} strokeWidth="1.4" />
          <circle r="58" strokeWidth="1" strokeDasharray="3 5" />
          <circle r="26" strokeWidth="1.4" />
          <circle r="8" strokeWidth="1.4" />
        </svg>
      </motion.div>
    </div>
  );
}

const FADERS = Array.from({ length: 14 }, (_, i) => ({
  l: 4 + i * 6.8, h: 70 + (i % 3) * 18, dur: 5 + ((i * 3) % 6), delay: -(i * 1.3),
}));

export default function AppBackground() {
  const pathname = usePathname();
  const override = useBackdropStore((s) => s.override);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const farY = useTransform(scrollY, [0, 1200], [0, -50]);
  const nearY = useTransform(scrollY, [0, 1200], [0, -160]);

  const scene = getScene(pathname);
  const figures = useBackdropStore((s) => s.figures);
  const [cycle, setCycle] = useState(0);
  const driven = !!scene.figures;

  // Figures tagged with a side fill only that side (Battle Optimizer: your team vs the opponent's)
  const sided = figures.some((f) => f.side);
  const leftFigs = sided ? figures.filter((f) => f.side === "left") : figures;
  const rightFigs = sided ? figures.filter((f) => f.side === "right") : figures;
  const leftFig = driven && leftFigs.length > 0 ? leftFigs[cycle % leftFigs.length] : null;
  const rightFig = driven && rightFigs.length > 0 ? rightFigs[cycle % rightFigs.length] : null;
  const active = leftFig ?? rightFig;

  // Several figures: step to the next one every 8s (each change is a fade-out then fade-in)
  const cycleCount = Math.max(leftFigs.length, rightFigs.length);
  useEffect(() => {
    if (!driven || cycleCount < 2 || reduceMotion) return;
    const id = setInterval(() => setCycle((c) => c + 1), 8000);
    return () => clearInterval(id);
  }, [driven, cycleCount, reduceMotion]);

  const type: PokemonTypeName = override ?? (scene.arena ? undefined : active?.types?.[0]) ?? scene.type;
  const glyphTypes: PokemonTypeName[] = !override && !scene.arena && active?.types?.length ? active.types : [type];
  const [t1, t2] = active?.types ?? [];
  const sideColor = (side: "left" | "right") =>
    scene.arena
      ? side === "left" ? "var(--shell-accent)" : "#3b82f6"
      : TYPE_COLOR[side === "left" ? (t1 ?? type) : (t2 ?? t1 ?? type)];
  const figureSize = scene.figureSize ?? DEFAULT_FIGURE;

  const [monL, monR] = TYPE_MONS[type];
  const defaultSilhouettes: ReactNode[] = [
    <Silhouette key={`${type}-l`} src={`${ART_BASE}/${monL}.png`} color={TYPE_COLOR[type]} side="left" />,
    <Silhouette key={`${type}-r`} src={`${ART_BASE}/${monR}.png`} color={TYPE_COLOR[type]} side="right" />,
  ];
  // Driven pages show their own Pokémon; the arena falls back to the type's default pair when empty
  const sideSrc = (side: "left" | "right") => {
    const fig = side === "left" ? leftFig : rightFig;
    if (fig) return fig.src;
    return scene.arena ? `${ART_BASE}/${side === "left" ? monL : monR}.png` : null;
  };
  const ballMotif = scene.motif === "balls" || scene.motif === "ballTypes";
  const tints = scene.motif === "ballTypes" ? BALL_TINTS : undefined;

  return (
    <div
      aria-hidden="true"
      data-glow={scene.glow}
      className="bg-glow pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ ["--bg-accent" as string]: TYPE_COLOR[type] }}
    >
      {ballMotif && (
        <motion.div className="absolute inset-x-0 -top-10 h-[130%]" style={{ y: reduceMotion ? 0 : farY }}>
          <BallLayer balls={FAR_BALLS} tints={tints} calm={scene.calm} />
        </motion.div>
      )}

      <AnimatePresence>
        {!ballMotif && (
          <motion.div
            key={scene.motif}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <MotifLayer motif={scene.motif} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="absolute inset-x-0 -top-20 h-[140%]" style={{ y: reduceMotion ? 0 : nearY }}>
        {ballMotif && <BallLayer balls={NEAR_BALLS} tints={tints} calm={scene.calm} />}
        <AnimatePresence>
          {GLYPHS.map((g, i) => {
            const gType = glyphTypes[i % glyphTypes.length];
            return (
              <motion.span
                key={`${gType}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: Math.min(1, g.o * BOOST) }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute"
                style={{ left: `${g.l}%`, top: `${g.t}%`, color: TYPE_COLOR[gType], opacity: g.o }}
              >
                <span style={{ display: "block", width: g.s, height: g.s }}>
                  <TypeIcon type={gType} className="h-full w-full" />
                </span>
              </motion.span>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {driven ? (
        <>
          {(["left", "right"] as const).map((side) => {
            const src = sideSrc(side);
            return (
              <AnimatePresence key={side} mode="wait">
                {src && (
                  <SideSilhouette
                    key={src}
                    side={side}
                    src={src}
                    color={sideColor(side)}
                    size={figureSize}
                    flip={flipFor(side, src)}
                  />
                )}
              </AnimatePresence>
            );
          })}
        </>
      ) : (
        <AnimatePresence>{defaultSilhouettes}</AnimatePresence>
      )}

      {scene.motif === "ballTypes" && figures.length > 0 &&
        (["left", "right"] as const).map((side) => <ItemGlints key={side} side={side} size={figureSize} />)}
      {scene.motif === "ballTypes" && <RollingBalls />}
      {pathname === "/" && <DexRadar />}

      {scene.vignette && (
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)" }}
        />
      )}
    </div>
  );
}