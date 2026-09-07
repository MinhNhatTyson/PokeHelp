"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ItemDetail, ItemNameEntry } from "@/lib/types";
import { fetchCompetitiveItemNameList, fetchItemDetail } from "@/lib/data/fetchAndCache";
import ItemResultCard from "@/components/ItemResultCard";

const MAX_NAME_SUGGESTIONS = 8;

export default function ItemSearchExplorer() {
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null);
  const [itemStatus, setItemStatus] = useState<"idle" | "loading" | "error">("idle");
  const [showDropdown, setShowDropdown] = useState(false);
  const [nameList, setNameList] = useState<ItemNameEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCompetitiveItemNameList().then(setNameList);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const nameMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nameList.filter((i) => i.name.startsWith(q)).slice(0, MAX_NAME_SUGGESTIONS);
  }, [query, nameList]);

  async function handleSelectItem(name: string) {
    setQuery("");
    setShowDropdown(false);
    setItemStatus("loading");
    const detail = await fetchItemDetail(name);
    if (detail) {
      setSelectedItem(detail);
      setItemStatus("idle");
    } else {
      setSelectedItem(null);
      setItemStatus("error");
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-w-3xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none"
    >
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />

      <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
        <h1 className="font-display text-2xl sm:text-3xl text-[color:var(--ink)]">Item lookup</h1>
        <p className="mt-1 text-sm text-[color:var(--ink)]/70">Search for a held item, Poké Ball, medicine, or key item.</p>

        <div className="relative mt-5">
          <label htmlFor="item-search" className="sr-only">Search for an item</label>
          <input
            id="item-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search items…"
            autoComplete="off"
            className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-[color:var(--ink)] outline-none placeholder:text-black/40 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          />

          {showDropdown && query.trim() && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg">
              {nameMatches.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[color:var(--ink)]/50">
                  No items match &quot;{query}&quot;.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto p-2">
                  {nameMatches.map((i) => (
                    <button
                      key={i.name}
                      type="button"
                      onClick={() => handleSelectItem(i.name)}
                      className="block w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm capitalize text-[color:var(--ink)] hover:bg-black/5"
                    >
                      {i.name.replace(/-/g, " ")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {itemStatus === "loading" && <p className="mt-4 text-sm text-[color:var(--ink)]/60">Loading item…</p>}
        {itemStatus === "error" && (
          <p className="mt-4 text-sm text-red-500">Couldn&apos;t load that item. Try another search.</p>
        )}

        {selectedItem && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="mb-4 text-sm text-[color:var(--ink)]/60 underline-offset-2 hover:underline"
            >
              ← Clear
            </button>
            <ItemResultCard item={selectedItem} />
          </div>
        )}
      </div>
    </div>
  );
}