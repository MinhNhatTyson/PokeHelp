"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { usePathname } from "next/navigation";
import { PokemonTypeName } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/typeMeta";
import { useBackdropStore } from "@/lib/store/backdropStore";
import TypeIcon from "@/components/TypeIcon";

const BOOST = 3; // raise/lower to taste (1 = the old values)
const ART = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

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

function Silhouette({ id, type, side }: { id: number; type: PokemonTypeName; side: "left" | "right" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: SILHOUETTE_OPACITY, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="absolute bottom-0"
      style={{
        [side]: "-3%",
        width: "clamp(240px, 36vw, 500px)",
        height: "clamp(240px, 36vw, 500px)",
        backgroundColor: TYPE_COLOR[type],
        WebkitMaskImage: `url(${ART(id)})`,
        maskImage: `url(${ART(id)})`,
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

// Mirrors NAV_ITEMS themeType in Header.tsx
const ROUTE_TYPE: Record<string, PokemonTypeName> = {
  "/": "grass",
  "/items": "poison",
  "/team": "water",
  "/optimizer": "fighting",
  "/history": "psychic",
  "/speed": "electric",
  "/battle": "fire",
};

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

function PokeBallShape({ size, opacity }: { size: number; opacity: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ opacity: Math.min(1, opacity * BOOST) }} className="text-[color:var(--screen)]">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 10h16" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function BallLayer({ balls }: { balls: Ball[] }) {
  return (
    <>
      {balls.map((b, i) => (
        <span
          key={i}
          className="bg-float absolute"
          style={{
            left: `${b.l}%`, top: `${b.t}%`,
            ["--dur" as string]: `${b.dur}s`, ["--delay" as string]: `${b.delay}s`,
            ["--dx" as string]: `${b.dx}px`, ["--dy" as string]: `${b.dy}px`, ["--rot" as string]: `${b.rot}deg`,
          }}
        >
          <PokeBallShape size={b.s} opacity={b.o} />
        </span>
      ))}
    </>
  );
}

export default function AppBackground() {
  const pathname = usePathname();
  const override = useBackdropStore((s) => s.override);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const farY = useTransform(scrollY, [0, 1200], [0, -50]);
  const nearY = useTransform(scrollY, [0, 1200], [0, -160]);

  const type: PokemonTypeName = override ?? ROUTE_TYPE[pathname] ?? "dragon";

  return (
    <div
      aria-hidden="true"
      className="bg-glow pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ ["--bg-accent" as string]: TYPE_COLOR[type] }}
    >
      <motion.div className="absolute inset-x-0 -top-10 h-[130%]" style={{ y: reduceMotion ? 0 : farY }}>
        <BallLayer balls={FAR_BALLS} />
      </motion.div>

      <motion.div className="absolute inset-x-0 -top-20 h-[140%]" style={{ y: reduceMotion ? 0 : nearY }}>
        <BallLayer balls={NEAR_BALLS} />
        <AnimatePresence>
          {GLYPHS.map((g, i) => (
            <motion.span
              key={`${type}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: Math.min(1, g.o * BOOST) }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute"
              style={{ left: `${g.l}%`, top: `${g.t}%`, color: TYPE_COLOR[type], opacity: g.o }}
            >
            <span style={{ display: "block", width: g.s, height: g.s }}>
                <TypeIcon type={type} className="h-full w-full" />
            </span>
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        <Silhouette key={`${type}-l`} id={TYPE_MONS[type][0]} type={type} side="left" />
        <Silhouette key={`${type}-r`} id={TYPE_MONS[type][1]} type={type} side="right" />
      </AnimatePresence>
    </div>
  );
}