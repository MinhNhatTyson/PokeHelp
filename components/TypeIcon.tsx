import { PokemonTypeName } from "@/lib/types";

export default function TypeIcon({ type, className = "h-4 w-4" }: { type: PokemonTypeName; className?: string }) {
  switch (type) {
    case "normal":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M10 3a7 7 0 100 14 7 7 0 000-14zm0 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/></svg>;
    case "fire":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><path d="M10 2c1 3-2 4-2 7a3 3 0 106 0c0-1-1-2-1-3 1 1 2 3 2 5a5 5 0 11-10 0c0-4 3-5 5-9z"/></svg>;
    case "water":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><path d="M10 2c3 4 6 7.5 6 10.5a6 6 0 11-12 0C4 9.5 7 6 10 2z"/></svg>;
    case "electric":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><path d="M11 1L3 12h5l-1 7 8-11h-5l1-7z"/></svg>;
    case "grass":
      return (
        <svg viewBox="0 0 20 20" className={className}>
          <path d="M4 16C4 8 10 3 17 3c0 7-5 13-13 13H4z" fill="currentColor" />
          <path d="M5 15c3-4 6-7 10-10" stroke="white" strokeOpacity="0.35" strokeWidth="1" fill="none" />
        </svg>
      );
    case "ice":
      return (
        <svg viewBox="0 0 20 20" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="10" y1="2" x2="10" y2="18" /><line x1="3" y1="6" x2="17" y2="14" /><line x1="3" y1="14" x2="17" y2="6" />
        </svg>
      );
    case "fighting":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><path d="M6 8a2 2 0 012-2h1V5a1.5 1.5 0 013 0v1h1a1.5 1.5 0 013 0v1h.5A1.5 1.5 0 0118 8.5V13a5 5 0 01-5 5H9a5 5 0 01-5-5V10a2 2 0 012-2z"/></svg>;
    case "poison":
      return (
        <svg viewBox="0 0 20 20" className={className}>
          <path d="M10 2c3 4 6 7.5 6 10.5a6 6 0 11-12 0C4 9.5 7 6 10 2z" fill="currentColor" />
          <circle cx="7.7" cy="13" r="1" fill="white" fillOpacity="0.7" /><circle cx="12.3" cy="13" r="1" fill="white" fillOpacity="0.7" />
        </svg>
      );
    case "ground":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><path d="M2 16l4-8 3 4 2-6 3 6 4-4 2 8H2z"/></svg>;
    case "flying":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><path d="M2 14c4-2 6-8 8-11 1 4 0 7-2 9 3-1 6-3 8-7 0 5-3 10-9 11-2 .4-4 0-5-2z"/></svg>;
    case "psychic":
      return (
        <svg viewBox="0 0 20 20" className={className}>
          <path d="M2 10c2-4 6-6 8-6s6 2 8 6c-2 4-6 6-8 6s-6-2-8-6z" fill="currentColor" />
          <circle cx="10" cy="10" r="2.3" fill="white" fillOpacity="0.7" />
        </svg>
      );
    case "bug":
      return (
        <svg viewBox="0 0 20 20" className={className}>
          <ellipse cx="10" cy="12" rx="5" ry="6" fill="currentColor" />
          <line x1="8" y1="4" x2="6" y2="1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="12" y1="4" x2="14" y2="1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "rock":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><polygon points="4,14 3,9 7,4 13,3 17,7 16,13 12,17 6,17" /></svg>;
    case "ghost":
      return (
        <svg viewBox="0 0 20 20" className={className}>
          <path d="M4 17V9a6 6 0 0112 0v8l-2-2-2 2-2-2-2 2-2-2-2 2z" fill="currentColor" />
          <circle cx="7.5" cy="9" r="1.1" fill="white" fillOpacity="0.7" /><circle cx="12.5" cy="9" r="1.1" fill="white" fillOpacity="0.7" />
        </svg>
      );
    case "dragon":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><path d="M4 18c0-8 4-14 10-16-2 5-1 9 2 11-4 1-8 3-12 5z"/></svg>;
    case "dark":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><path d="M12 2a8 8 0 100 16 6 6 0 010-16z"/></svg>;
    case "steel":
      return (
        <svg viewBox="0 0 20 20" className={className}>
          <polygon points="10,2 16,5.5 16,12.5 10,16 4,12.5 4,5.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="10" cy="9" r="2.3" fill="currentColor" />
        </svg>
      );
    case "fairy":
      return <svg viewBox="0 0 20 20" className={className} fill="currentColor"><path d="M10 2l1.8 6.2L18 10l-6.2 1.8L10 18l-1.8-6.2L2 10l6.2-1.8z"/></svg>;
  }
}