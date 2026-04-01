interface TDCoinProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

/**
 * Moeda dourada personalizada com as iniciais "TD" (Tiago Demay) gravadas.
 * Substitui o emoji 🪙 em toda a aplicação.
 */
export default function TDCoin({ size = 22, animate = false, className }: TDCoinProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        filter: "drop-shadow(0 0 3px rgba(245,200,66,0.55))",
        flexShrink: 0,
        animation: animate ? "coin-spin 3s linear infinite" : undefined,
        display: "inline-block",
        verticalAlign: "middle",
      }}
    >
      {/* Outer rim */}
      <circle cx="14" cy="14" r="13" fill="url(#tdCoinGrad)" stroke="#b8860b" strokeWidth="1.2" />
      {/* Inner bevel ring */}
      <circle cx="14" cy="14" r="11" fill="none" stroke="#ffd700" strokeWidth="0.8" opacity="0.6" />
      {/* Inner face */}
      <circle cx="14" cy="14" r="10" fill="url(#tdCoinFace)" />
      {/* Highlight arc */}
      <path
        d="M 7 9 A 8 8 0 0 1 21 9"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Letters TD */}
      <text
        x="14"
        y="18"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="bold"
        fontSize="9"
        fill="#7a5200"
        stroke="#ffd700"
        strokeWidth="0.3"
        letterSpacing="0.5"
      >
        TD
      </text>
      <defs>
        <radialGradient id="tdCoinGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="40%" stopColor="#f5c842" />
          <stop offset="80%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#8b6914" />
        </radialGradient>
        <radialGradient id="tdCoinFace" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffd966" />
          <stop offset="60%" stopColor="#e6b800" />
          <stop offset="100%" stopColor="#b8860b" />
        </radialGradient>
      </defs>
    </svg>
  );
}
