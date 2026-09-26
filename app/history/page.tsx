import BattleHistoryPanel from "@/components/BattleHistoryPanel";

export default function HistoryPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[color:var(--background)] px-4 py-16">
      <div className="w-full max-w-3xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
        <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />
        <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
          <h1 className="font-display text-2xl sm:text-3xl text-[color:var(--ink)]">Battle history</h1>
          <p className="mt-1 text-sm text-[color:var(--ink)]/70">
            Your last 10 logged battles — PokeHelp uses these to sharpen AI strategy suggestions.
          </p>
          <div className="mt-6">
            <BattleHistoryPanel />
          </div>
        </div>
      </div>
    </div>
  );
}