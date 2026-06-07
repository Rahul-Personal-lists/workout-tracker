// Pure presentational — no hooks, no server-only deps — so it renders in both
// server (loading screens) and client (splash, login) trees. The per-letter
// spans drive the staggered bounce-in; aria-label keeps it one word for SR.
const BRAND_LETTERS = ["T", "r", "a", "i", "n", "r"];

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={className ?? "inline-flex"} aria-label="Trainr">
      {BRAND_LETTERS.map((ch, i) => (
        <span
          key={i}
          className="inline-block animate-letter-bounce"
          style={{ animationDelay: `${0.45 + i * 0.06}s` }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
