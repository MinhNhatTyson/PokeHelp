"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import TeamSlotPicker from "@/components/TeamSlotPicker";

export default function SlotEditorModal({ index, onClose }: { index: number | null; onClose: () => void }) {
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [index, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {index !== null && (
        <motion.div
          key="slot-editor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit slot ${index + 1}`}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="pokecard flex h-[92dvh] w-full max-w-lg flex-col rounded-b-none sm:h-auto sm:max-h-[85dvh] sm:rounded-b-[1.25rem]"
            style={{ borderColor: "var(--accent-gold)" }}
          >
            <div className="h-2 shrink-0 bg-gradient-to-r from-[color:var(--shell-accent)] via-[color:var(--accent-gold)] to-[color:var(--shell-accent)]" />
            <div className="flex-1 overflow-y-auto bg-[color:var(--screen)] p-4 pb-2">
              <TeamSlotPicker index={index} />
            </div>
            <div className="shrink-0 bg-[color:var(--screen)] p-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-md bg-[color:var(--shell-accent)] px-3 py-2.5 text-sm font-medium text-white btn-tactile btn-glow-accent"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}