import { useState, type KeyboardEvent } from "react";

interface UseListNavOptions<T> {
  items: T[];
  isOpen: boolean;              // is the dropdown currently visible?
  onSelect: (item: T) => void;  // Enter (or click) picks an item
  onClose: () => void;          // Esc closes the dropdown
  onOpen?: () => void;          // ArrowDown re-opens a closed dropdown
}

export function useListNav<T>({ items, isOpen, onSelect, onClose, onOpen }: UseListNavOptions<T>) {
  const [active, setActive] = useState(0);
  const count = items.length;
  // Clamp instead of resetting in an effect, so the list can shrink while typing.
  const activeIndex = count === 0 ? -1 : Math.min(active, count - 1);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || count === 0) {
      if (e.key === "ArrowDown" && onOpen) { e.preventDefault(); onOpen(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((activeIndex + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((activeIndex - 1 + count) % count);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSelect(items[activeIndex]); // Enter with no arrow presses picks the first match
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return {
    activeIndex,
    resetActive: () => setActive(0), // call from the input's onChange
    inputProps: {
      onKeyDown,
      role: "combobox" as const,
      "aria-expanded": isOpen && count > 0,
      "aria-autocomplete": "list" as const,
    },
    optionProps: (i: number) => ({
      role: "option" as const,
      "aria-selected": i === activeIndex,
      onMouseMove: () => setActive(i), // onMouseMove, not onMouseEnter, so keyboard scrolling doesn't fight the pointer
      ref: (el: HTMLElement | null) => { if (i === activeIndex) el?.scrollIntoView({ block: "nearest" }); },
    }),
  };
}