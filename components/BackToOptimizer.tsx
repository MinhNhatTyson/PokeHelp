"use client";

import Link from "next/link";

export default function BackToOptimizer({ confirmMessage }: { confirmMessage?: string }) {
  return (
    <Link
      href="/optimizer"
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
      className="btn-tactile mb-4 inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-full bg-black/10 py-1.5 pl-2.5 pr-4 text-xs font-medium uppercase tracking-wide text-[color:var(--ink)]"
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Battle Optimizer
    </Link>
  );
}