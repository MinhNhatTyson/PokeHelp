// In-game style HP colours: green > 50%, amber > 20%, red below.
export function hpColor(pct: number) {
  return pct > 50 ? "#10b981" : pct > 20 ? "#f59e0b" : "#ef4444";
}

export default function HpBar({ pct, lost = 0, gain = 0, className = "h-2.5" }: {
  pct: number;   // HP before the pending change
  lost?: number; // pending damage, striped red "ghost" segment
  gain?: number; // pending healing, striped green segment
  className?: string;
}) {
  const now = Math.max(0, Math.min(100, pct));
  const loss = Math.max(0, Math.min(now, lost));
  const left = now - loss;
  return (
    <div role="img" aria-label={`${left}% HP`} className={`relative overflow-hidden rounded-full bg-black/15 ${className}`}>
      <div
        className="absolute inset-y-0 left-0 transition-[width,background-color] duration-500 motion-reduce:transition-none"
        style={{ width: `${left}%`, backgroundColor: hpColor(left) }}
      />
      {loss > 0 && (
        <div
          className="absolute inset-y-0 transition-[left,width] duration-150 motion-reduce:transition-none"
          style={{
            left: `${left}%`, width: `${loss}%`,
            background: "repeating-linear-gradient(45deg, rgba(239,68,68,.9) 0 4px, rgba(239,68,68,.45) 4px 8px)",
          }}
        />
      )}
      {gain > 0 && (
        <div
          className="absolute inset-y-0 transition-[left,width] duration-150 motion-reduce:transition-none"
          style={{
            left: `${now}%`, width: `${Math.min(gain, 100 - now)}%`,
            background: "repeating-linear-gradient(45deg, rgba(16,185,129,.9) 0 4px, rgba(16,185,129,.45) 4px 8px)",
          }}
        />
      )}
    </div>
  );
}