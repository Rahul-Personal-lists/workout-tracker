type MarkProps = { size?: number };

export function KettlePopMark({ size = 240 }: MarkProps) {
  return (
    <svg viewBox="0 0 240 240" width={size} height={size}>
      <path
        d="M 30 110 Q 80 40 200 70"
        fill="none"
        stroke="#06b6d4"
        strokeWidth={10}
        strokeLinecap="round"
      />
      <path
        d="M 86 92 Q 86 56 120 56 Q 154 56 154 92"
        fill="none"
        stroke="#8b5cf6"
        strokeWidth={14}
        strokeLinecap="round"
      />
      <path
        d="M 76 105 Q 72 96 86 92 L 154 92 Q 168 96 164 105 Q 196 130 196 165 Q 196 200 120 200 Q 44 200 44 165 Q 44 130 76 105 Z"
        fill="#ff5b4a"
      />
      <path
        d="M 120 92 L 154 92 Q 168 96 164 105 Q 196 130 196 165 Q 196 200 120 200 Z"
        fill="#ec4899"
      />
    </svg>
  );
}

type LogoProps = { size?: number };

export function LogoKettlePop({ size = 96 }: LogoProps) {
  const inner = Math.round(size * 0.8);
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#fff5b8",
        borderRadius: size * 0.225,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <KettlePopMark size={inner} />
    </div>
  );
}
