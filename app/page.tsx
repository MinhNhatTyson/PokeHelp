import TypeMatchupExplorer from "@/components/TypeMatchupExplorer";
import PokemonSearch from "@/components/PokemonSearch";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center gap-10 bg-[color:var(--background)] px-4 py-16">
      <TypeMatchupExplorer />
      <PokemonSearch />
    </div>
  );
}