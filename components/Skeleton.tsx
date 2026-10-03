export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-black/10 motion-reduce:animate-none ${className}`} />;
}