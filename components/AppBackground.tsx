"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { usePathname } from "next/navigation";
import { PokemonTypeName } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/typeMeta";
import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { useBackdropStore } from "@/lib/store/backdropStore";
import TypeIcon from "@/components/TypeIcon";
import { getScene, type SceneMotif } from "@/lib/backgroundScenes";
import { useBattleHistoryStore, MAX_BATTLE_HISTORY } from "@/lib/store/battleHistoryStore";


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

const SILHOUETTE_OPACITY = 0.16;

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
      return (
        <>
          {STREAKS.map((s, i) => (
            <span
              key={i}
              className="bg-streak absolute"
              style={{
                top: `${s.t}%`, left: 0, width: s.w, height: 2, borderRadius: 2,
                background: "linear-gradient(90deg, transparent, var(--bg-accent))",
                ["--dur" as string]: `${s.dur}s`, ["--delay" as string]: `${s.delay}s`, ["--o" as string]: `${s.o}`,
              }}
            />
          ))}
        </>
      );

    case "embers":
      return (
        <>
          {EMBERS.map((e, i) => (
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
        </>
      );

    case "grid": {
      const line = "color-mix(in srgb, var(--screen) 6%, transparent)";
      const fade = "radial-gradient(ellipse at center, black 30%, transparent 75%)";
      return (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
              backgroundSize: "48px 48px", maskImage: fade, WebkitMaskImage: fade,
            }}
          />
          <div className="bg-spin absolute" style={{ right: "4%", top: "50%", width: "clamp(260px, 34vw, 520px)", aspectRatio: "1", marginTop: "calc(clamp(260px, 34vw, 520px) / -2)", ["--dur" as string]: "120s" }}>
            <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" style={RETICLE_STYLE}>
              <circle cx="100" cy="100" r="90" strokeWidth="1" />
              <circle cx="100" cy="100" r="58" strokeWidth="1" strokeDasharray="6 6" />
              <path d="M100 0v40M100 160v40M0 100h40M160 100h40" strokeWidth="1.2" />
            </svg>
          </div>
        </>
      );
    }

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
        </>
      );
    }

    case "timeline":
      return <TimelineMotif />;

    case "machinery":
      return (
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
                className="bg-fader absolute rounded-sm"
                style={{
                  left: -6, bottom: 0, width: 14, height: 8, background: "var(--bg-accent)", opacity: 0.55,
                  ["--travel" as string]: `${-(f.h - 8)}px`, ["--dur" as string]: `${f.dur}s`, ["--delay" as string]: `${f.delay}s`,
                }}
              />
            </span>
          ))}
        </div>
      );

    default:
      return null; // "balls" / "ballTypes" are handled by BallLayer
  }
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
  return (
    <div className="h-full w-full" style={{ transform: `rotate(${offset}deg)` }}>
      <div className="bg-spin h-full w-full" style={{ ["--dur" as string]: `${dur}s`, animationDirection: reverse ? "reverse" : "normal" }}>
        <svg viewBox="-100 -100 200 200" className="h-full w-full" fill="none" style={RETICLE_STYLE}>
          <path d={GEAR_D} strokeWidth="1.4" />
          <circle r="58" strokeWidth="1" strokeDasharray="3 5" />
          <circle r="26" strokeWidth="1.4" />
          <circle r="8" strokeWidth="1.4" />
        </svg>
      </div>
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

      {scene.vignette && (
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)" }}
        />
      )}
    </div>
  );
}