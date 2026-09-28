import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import localFont from "next/font/local";

const pokemonSolid = localFont({
  src: "../fonts/pokemon-solid-font/PokemonSolidNormal-xyWR.ttf",
  variable: "--font-logo",
  display: "swap",
});

const omegaRuby = localFont({
  src: "../fonts/omega-ruby-font/OmegaRuby-PlEB.ttf",
  variable: "--font-heading",
  display: "swap",
});

const pokemonPixels = localFont({
  src: "../fonts/pokemon-pixels-font/PokemonPixels1-jYmj.ttf",
  variable: "--font-pixel",
  display: "swap",
});

const lmsPokedex = localFont({
  src: "../fonts/lms-pokedex-font/LmsPokedex-XEja.ttf",
  variable: "--font-dex",
  display: "swap",
});

const unownFont = localFont({
  src: "../fonts/heavenezer-s-unown-font/HeavenezersUnown-rvWM7.ttf",
  variable: "--font-unown",
  display: "swap",
});

const pokemonPixelsSpritesA = localFont({
  src: "../fonts/pokemon-pixels-font/PokemonPixels2-59jx.ttf",
  variable: "--font-pixelmon-a",
  display: "swap",
});

const pokemonPixelsSpritesB = localFont({
  src: "../fonts/pokemon-pixels-font/PokemonPixels2-zljG.ttf",
  variable: "--font-pixelmon-b",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PokeHelp",
  description: "Type matchup helper for your Pokémon run.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${pokemonSolid.variable} ${omegaRuby.variable} ${pokemonPixels.variable} ${lmsPokedex.variable} ${unownFont.variable} ${pokemonPixelsSpritesA.variable} ${pokemonPixelsSpritesB.variable} h-full antialiased`}
    >
      <body className="min-h-full flex w-full flex-col">
        <Header />
        <main className="flex w-full flex-1 flex-col pb-20 lg:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </body>
    </html>
  );
}
