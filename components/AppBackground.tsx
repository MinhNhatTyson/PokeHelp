"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { usePathname } from "next/navigation";
import { PokemonTypeName } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/typeMeta";
import { useEffect, useState, type ReactNode } from "react";
import { useBackdropStore, type BackdropFigure } from "@/lib/store/backdropStore";
import TypeIcon from "@/components/TypeIcon";
import { getScene, type SceneMotif } from "@/lib/backgroundScenes";


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

    default:
      return null; // "balls" / "ballTypes" are handled by BallLayer
  }
}

export default function AppBackground() {
  const pathname = usePathname();
  const override = useBackdropStore((s) => s.override);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const farY = useTransform(scrollY, [0, 1200], [0, -50]);
  const nearY = useTransform(scrollY, [0, 1200], [0, -160]);

  const scene = getScene(pathname);
  const type: PokemonTypeName = override ?? scene.type;
  const figures = useBackdropStore((s) => s.figures);
  const [cycle, setCycle] = useState(0);
  const driven = !!scene.figures;

  // Several figures (full team): rotate through them, one at a time
  useEffect(() => {
    if (!driven || figures.length < 2 || reduceMotion) return;
    const id = setInterval(() => setCycle((c) => c + 1), 8000);
    return () => clearInterval(id);
  }, [driven, figures.length, reduceMotion]);

  const colorOf = (f: BackdropFigure) => TYPE_COLOR[f.type ?? scene.type];
  const silhouettes: ReactNode[] = [];
  if (!driven) {
    const [l, r] = TYPE_MONS[type];
    silhouettes.push(
      <Silhouette key={`${type}-l`} src={`${ART_BASE}/${l}.png`} color={TYPE_COLOR[type]} side="left" />,
      <Silhouette key={`${type}-r`} src={`${ART_BASE}/${r}.png`} color={TYPE_COLOR[type]} side="right" />
    );
  } else if (figures.length > 0) {
    const f = figures[cycle % figures.length];
    silhouettes.push(
      <Silhouette key={`l-${f.src}`} src={f.src} color={colorOf(f)} side="left" size={scene.figureSize} />,
      <Silhouette key={`r-${f.src}`} src={f.src} color={colorOf(f)} side="right" size={scene.figureSize} />
    );
  }
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

      <AnimatePresence>{silhouettes}</AnimatePresence>

      {scene.vignette && (
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)" }}
        />
      )}
    </div>
  );
}