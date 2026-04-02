import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { LEVELS, canUnlock, type Level } from "../data/levels";
import { getTaskByLevel } from "../data/tasks";

interface RPGMapProps {
  unlockedLevels: string[];
  completedLevels: string[];
  currentLevel: string;
  coins: number;
  onSelectLevel: (level: Level) => void;
  onUnlockLevel: (level: Level) => void;
  onOpenShop: () => void;
}

// SVG path connections between levels
const CONNECTIONS = [
  ["floresta-stallman", "tundra-slackware"],
  ["floresta-stallman", "pantano-systemd"],
  ["tundra-slackware", "montanhas-kernighan"],
  ["tundra-slackware", "reino-torvalds"],
  ["montanhas-kernighan", "planicies-redhat"],
  ["pantano-systemd", "reino-torvalds"],
  ["pantano-systemd", "deserto-debian"],
  ["reino-torvalds", "cidade-gnu"],
  ["reino-torvalds", "deserto-debian"],
  ["cidade-gnu", "planicies-redhat"],
  ["cidade-gnu", "ilhas-canonical"],
  ["deserto-debian", "ilhas-canonical"],
  ["ilhas-canonical", "vale-arch"],
];

function getLevelById(id: string) {
  return LEVELS.find((l) => l.id === id);
}

interface TooltipData {
  id: string;
  rect: DOMRect;
}

/** Tooltip renderizado via portal no body para evitar clipping do container pai */
function MapTooltip({
  tooltipData,
  children,
}: {
  tooltipData: TooltipData;
  children: React.ReactNode;
}) {
  const TOOLTIP_WIDTH = 260;
  const TOOLTIP_MARGIN = 12;

  const { rect } = tooltipData;

  // Posição horizontal: centralizado no marcador, mas clamped dentro da viewport
  let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 8));

  // Posição vertical: prefere acima do marcador; se não couber, vai abaixo
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const showBelow = spaceAbove < 180 || spaceBelow > spaceAbove;

  const top = showBelow
    ? rect.bottom + TOOLTIP_MARGIN
    : rect.top - TOOLTIP_MARGIN;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left,
        top,
        transform: showBelow ? "none" : "translateY(-100%)",
        width: TOOLTIP_WIDTH,
        zIndex: 9999,
        background: "rgba(42,24,10,0.98)",
        border: "2px solid #8b6914",
        borderRadius: "10px",
        padding: "12px 14px",
        color: "#f0deb4",
        fontSize: "0.75rem",
        lineHeight: 1.55,
        boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export default function RPGMap({
  unlockedLevels,
  completedLevels,
  currentLevel,
  coins,
  onSelectLevel,
  onUnlockLevel,
  onOpenShop,
}: RPGMapProps) {
  const [hoveredLevel, setHoveredLevel] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [sparkleId, setSparkleId] = useState(0);

  const triggerSparkle = (x: number, y: number) => {
    const id = sparkleId + 1;
    setSparkleId(id);
    setSparkles((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setSparkles((prev) => prev.filter((s) => s.id !== id)), 1000);
  };

  const handleLevelClick = (level: Level) => {
    if (unlockedLevels.includes(level.id)) {
      onSelectLevel(level);
    } else if (canUnlock(level.id, unlockedLevels, coins)) {
      onUnlockLevel(level);
      triggerSparkle(level.x, level.y);
    }
  };

  const getLevelStatus = (level: Level) => {
    if (completedLevels.includes(level.id)) return "completed";
    if (level.id === currentLevel) return "current";
    if (unlockedLevels.includes(level.id)) return "unlocked";
    if (canUnlock(level.id, unlockedLevels, coins)) return "available";
    return "locked";
  };

  const handleMouseEnter = useCallback((id: string, el: HTMLDivElement | null) => {
    setHoveredLevel(id);
    if (el) {
      setTooltipData({ id, rect: el.getBoundingClientRect() });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredLevel(null);
    setTooltipData(null);
  }, []);

  return (
    <div className="relative w-full h-full" style={{ aspectRatio: "16/9", maxHeight: "calc(100vh - 72px)", margin: "auto" }}>
      {/* Real map image background */}
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          backgroundImage: `url("https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/mapa_rpg_linux4k_aa25ec90.webp")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* ── CONNECTION PATHS (SVG) ── */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ zIndex: 1 }}
        >
          <defs>
            {/* Filtro de textura para dar aspecto de terra/pergaminho */}
            <filter id="road-texture" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            {/* Gradiente para estradas ativas */}
            <linearGradient id="road-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7a5c2e" />
              <stop offset="50%" stopColor="#a07840" />
              <stop offset="100%" stopColor="#7a5c2e" />
            </linearGradient>
            {/* Gradiente para estradas inativas */}
            <linearGradient id="road-inactive" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a3820" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#4a3820" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {CONNECTIONS.map(([fromId, toId]) => {
            const from = getLevelById(fromId);
            const to = getLevelById(toId);
            if (!from || !to) return null;
            const isActive =
              unlockedLevels.includes(fromId) && unlockedLevels.includes(toId);

            // Calcular ponto de controle para curva quadrática Bézier
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const curve = Math.min(len * 0.18, 8);
            const seed = (fromId.charCodeAt(0) + toId.charCodeAt(0)) % 2 === 0 ? 1 : -1;
            const cpx = mx + ((-dy / len) * curve * seed);
            const cpy = my + ((dx / len) * curve * seed);
            const d = `M ${from.x} ${from.y} Q ${cpx} ${cpy} ${to.x} ${to.y}`;

            const bezierPoint = (t: number) => {
              const bx = (1-t)*(1-t)*from.x + 2*(1-t)*t*cpx + t*t*to.x;
              const by = (1-t)*(1-t)*from.y + 2*(1-t)*t*cpy + t*t*to.y;
              return { x: bx, y: by };
            };
            const stone1 = bezierPoint(0.33);
            const stone2 = bezierPoint(0.66);

            return (
              <g key={`${fromId}-${toId}`}>
                {/* Sombra da estrada */}
                <path
                  d={d}
                  fill="none"
                  stroke="#1a0f00"
                  strokeWidth={isActive ? "1.4" : "0.9"}
                  strokeLinecap="round"
                  opacity={isActive ? 0.35 : 0.2}
                  transform="translate(0.15, 0.2)"
                />
                {/* Borda externa da estrada (terra escura) */}
                <path
                  d={d}
                  fill="none"
                  stroke={isActive ? "#5c3d1a" : "#3a2a12"}
                  strokeWidth={isActive ? "1.2" : "0.7"}
                  strokeLinecap="round"
                  opacity={isActive ? 0.7 : 0.3}
                  filter="url(#road-texture)"
                />
                {/* Corpo principal da estrada */}
                <path
                  d={d}
                  fill="none"
                  stroke={isActive ? "url(#road-active)" : "url(#road-inactive)"}
                  strokeWidth={isActive ? "0.7" : "0.4"}
                  strokeLinecap="round"
                  strokeDasharray={isActive ? "none" : "1.5,0.8"}
                  opacity={isActive ? 0.85 : 0.45}
                  filter="url(#road-texture)"
                />
                {/* Linha central pontilhada (apenas estradas ativas) */}
                {isActive && (
                  <path
                    d={d}
                    fill="none"
                    stroke="#d4a96a"
                    strokeWidth="0.15"
                    strokeLinecap="round"
                    strokeDasharray="0.6,1.2"
                    opacity={0.5}
                  />
                )}
                {/* Pedras miliárias ao longo do caminho */}
                {[stone1, stone2].map((pt, i) => (
                  <g key={i} transform={`translate(${pt.x}, ${pt.y})`} opacity={isActive ? 0.9 : 0.5}>
                    <ellipse cx="0.15" cy="0.9" rx="0.7" ry="0.2" fill="#1a0f00" opacity="0.3" />
                    <rect x="-0.45" y="0.55" width="0.9" height="0.35" rx="0.1"
                      fill={isActive ? "#5c3d1a" : "#3a2a12"} opacity="0.8" />
                    <rect x="-0.38" y="-0.55" width="0.76" height="1.15" rx="0.15"
                      fill={isActive ? "#8a7055" : "#5a4a35"}
                      stroke={isActive ? "#4a3020" : "#2a1a0a"}
                      strokeWidth="0.06" />
                    <rect x="-0.3" y="-0.48" width="0.6" height="1.0" rx="0.1"
                      fill={isActive ? "#a08060" : "#6a5a45"} opacity="0.7" />
                    <text
                      x="0" y="0.12"
                      textAnchor="middle"
                      fontSize="0.35"
                      fontFamily="serif"
                      fontWeight="bold"
                      fill={isActive ? "#2a1a0a" : "#1a0f00"}
                      opacity="0.8"
                    >{i === 0 ? "I" : "II"}</text>
                    <line x1="-0.25" y1="-0.18" x2="0.25" y2="-0.18"
                      stroke={isActive ? "#3a2510" : "#2a1a0a"}
                      strokeWidth="0.04" opacity="0.6" />
                  </g>
                ))}
              </g>
            );
          })}
        </svg>

        {/* ── LEVEL NODES ── */}
        {LEVELS.map((level) => {
          const status = getLevelStatus(level);
          const task = getTaskByLevel(level.id);
          const isHovered = hoveredLevel === level.id;

          const statusStyles = {
            completed: {
              border: "3px solid #27ae60",
              background: "rgba(39,174,96,0.85)",
              shadow: "0 0 12px rgba(39,174,96,0.6)",
              textColor: "#fff",
            },
            current: {
              border: "3px solid #f39c12",
              background: "rgba(243,156,18,0.9)",
              shadow: "0 0 16px rgba(243,156,18,0.8)",
              textColor: "#fff",
            },
            unlocked: {
              border: "2px solid #8b6914",
              background: "rgba(240,222,180,0.92)",
              shadow: "0 2px 8px rgba(0,0,0,0.3)",
              textColor: "#3d2b1f",
            },
            available: {
              border: "2px dashed #27ae60",
              background: "rgba(240,222,180,0.85)",
              shadow: "0 2px 8px rgba(39,174,96,0.3)",
              textColor: "#3d2b1f",
            },
            locked: {
              border: "2px solid #7f8c8d",
              background: "rgba(200,200,200,0.6)",
              shadow: "none",
              textColor: "#666",
            },
          };

          const style = statusStyles[status];

          return (
            <div
              key={level.id}
              className="absolute cursor-pointer select-none transition-all duration-200"
              style={{
                left: `${level.x}%`,
                top: `${level.y}%`,
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.15 : 1})`,
                zIndex: isHovered ? 20 : 10,
              }}
              onMouseEnter={(e) => handleMouseEnter(level.id, e.currentTarget)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleLevelClick(level)}
            >
              {/* Anel duplo pulsante exclusivo do Reino de Torvalds */}
              {level.id === "reino-torvalds" && (
                <>
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: "72px",
                      height: "72px",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      border: "2px solid #f5c842",
                      animation: "kingdom-ring-outer 2s ease-in-out infinite",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: "62px",
                      height: "62px",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      border: "2px solid #fde68a",
                      animation: "kingdom-ring-inner 2s ease-in-out infinite",
                      animationDelay: "0.4s",
                      pointerEvents: "none",
                    }}
                  />
                </>
              )}

              {/* Node circle */}
              <div
                className="flex flex-col items-center gap-0.5"
                style={{
                  border: level.id === "reino-torvalds" ? "3px solid #f5c842" : style.border,
                  borderRadius: "50%",
                  width: "52px",
                  height: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: level.id === "reino-torvalds" && status === "locked"
                    ? "rgba(139,69,19,0.75)"
                    : style.background,
                  boxShadow: level.id === "reino-torvalds"
                    ? "0 0 20px rgba(245,200,66,0.8), 0 0 40px rgba(245,200,66,0.3)"
                    : style.shadow,
                  position: "relative",
                }}
              >
                <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>{level.icon}</span>
                {status === "completed" && (
                  <span
                    className="absolute -top-1 -right-1 text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                    style={{ fontSize: "0.6rem" }}
                  >
                    ✓
                  </span>
                )}
                {status === "locked" && (
                  <span
                    className="absolute -top-1 -right-1 text-xs bg-gray-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                    style={{ fontSize: "0.6rem" }}
                  >
                    🔒
                  </span>
                )}
                {status === "current" && (
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      animation: "pulse-ring 1.5s ease-out infinite",
                      border: "2px solid #f39c12",
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <div
                className="absolute whitespace-nowrap text-center font-bold"
                style={{
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginTop: "4px",
                  fontFamily: "'MedievalSharp', serif",
                  fontSize: "0.55rem",
                  textShadow: "1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)",
                  maxWidth: "80px",
                  lineHeight: 1.2,
                  background: "rgba(30,15,5,0.75)",
                  padding: "2px 5px",
                  borderRadius: "4px",
                  border: "1px solid rgba(200,160,40,0.6)",
                  color: "#f5e6c8",
                }}
              >
                {level.name}
              </div>

              {/* Cost badge for available levels */}
              {status === "available" && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-1 rounded"
                  style={{
                    background: "#27ae60",
                    color: "#fff",
                    fontSize: "0.5rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  🪙 {level.unlockCost}
                </div>
              )}

              {/* Tooltip via portal (sem clipping) */}
              {isHovered && tooltipData?.id === level.id && (
                <MapTooltip tooltipData={tooltipData}>
                  <div
                    style={{
                      fontFamily: "'MedievalSharp', serif",
                      fontSize: "0.8rem",
                      color: "#f5c842",
                      fontWeight: "bold",
                      marginBottom: "6px",
                      borderBottom: "1px solid rgba(139,105,20,0.5)",
                      paddingBottom: "6px",
                    }}
                  >
                    {level.icon} {level.name}
                  </div>
                  <div style={{ fontSize: "0.72rem", opacity: 0.9, marginBottom: "8px", color: "#f0deb4" }}>
                    {level.description}
                  </div>
                  {task && (
                    <div
                      style={{
                        fontSize: "0.7rem",
                        borderTop: "1px solid rgba(139,105,20,0.4)",
                        paddingTop: "6px",
                        marginTop: "4px",
                        color: "#f0deb4",
                      }}
                    >
                      <span style={{ color: "#f5c842", fontWeight: "bold" }}>Missão:</span>{" "}
                      {task.title}
                    </div>
                  )}
                  <div style={{ marginTop: "8px", fontSize: "0.72rem" }}>
                    {status === "completed" && <span style={{ color: "#4ade80" }}>✓ Concluído</span>}
                    {status === "current" && <span style={{ color: "#fbbf24" }}>▶ Em progresso</span>}
                    {status === "unlocked" && <span style={{ color: "#93c5fd" }}>🔓 Desbloqueado</span>}
                    {status === "available" && (
                      <span style={{ color: "#86efac" }}>🪙 Custo: {level.unlockCost} moedas — clique para desbloquear!</span>
                    )}
                    {status === "locked" && (
                      <div>
                        <div style={{ color: "#9ca3af" }}>🔒 Bloqueado</div>
                        <div style={{ color: "#fde68a", marginTop: "4px" }}>
                          Precisa de{" "}
                          <span style={{ color: "#fcd34d", fontWeight: "bold" }}>{level.unlockCost}</span>{" "}
                          🪙 moedas para desbloquear
                        </div>
                        <div style={{ color: "#6b7280", fontSize: "0.65rem", marginTop: "4px" }}>
                          Você tem {coins} 🪙 moedas
                        </div>
                      </div>
                    )}
                  </div>
                </MapTooltip>
              )}
            </div>
          );
        })}

        {/* ── LOJA DO TUX ── */}
        {(() => {
          const shopX = 44;
          const shopY = 60;
          const shopHovered = hoveredLevel === "__shop__";
          return (
            <div
              className="absolute cursor-pointer select-none transition-all duration-200"
              style={{
                left: `${shopX}%`,
                top: `${shopY}%`,
                transform: `translate(-50%, -50%) scale(${shopHovered ? 1.2 : 1})`,
                zIndex: shopHovered ? 20 : 10,
              }}
              onMouseEnter={(e) => handleMouseEnter("__shop__", e.currentTarget)}
              onMouseLeave={handleMouseLeave}
              onClick={onOpenShop}
            >
              {/* Animated glow ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  animation: "shop-pulse 2s ease-in-out infinite",
                  border: "2px solid #f5c842",
                  borderRadius: "50%",
                  width: "56px",
                  height: "56px",
                }}
              />
              {/* Shop node */}
              <div
                style={{
                  border: "3px solid #f5c842",
                  borderRadius: "50%",
                  width: "52px",
                  height: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(245,200,66,0.2)",
                  boxShadow: "0 0 16px rgba(245,200,66,0.5), inset 0 0 8px rgba(245,200,66,0.1)",
                  position: "relative",
                }}
              >
                <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>🐧</span>
              </div>
              {/* Label */}
              <div
                className="absolute whitespace-nowrap text-center font-bold"
                style={{
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginTop: "4px",
                  fontFamily: "'MedievalSharp', serif",
                  fontSize: "0.55rem",
                  textShadow: "1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)",
                  maxWidth: "80px",
                  lineHeight: 1.2,
                  background: "rgba(30,15,5,0.85)",
                  padding: "2px 5px",
                  borderRadius: "4px",
                  border: "1px solid rgba(245,200,66,0.8)",
                  color: "#f5c842",
                }}
              >
                Loja do Tux
              </div>
              {/* Shop tooltip via portal */}
              {shopHovered && tooltipData?.id === "__shop__" && (
                <MapTooltip tooltipData={tooltipData}>
                  <div
                    style={{
                      fontFamily: "'MedievalSharp', serif",
                      fontSize: "0.8rem",
                      color: "#f5c842",
                      fontWeight: "bold",
                      marginBottom: "6px",
                      borderBottom: "1px solid rgba(245,200,66,0.4)",
                      paddingBottom: "6px",
                    }}
                  >
                    🐧 Loja do Tux
                  </div>
                  <div style={{ fontSize: "0.72rem", opacity: 0.9, marginBottom: "8px", color: "#f0deb4" }}>
                    Adquira ferramentas, dicas e poderes para sua jornada pelo reino Linux.
                  </div>
                  <div style={{ color: "#f5c842", fontSize: "0.7rem" }}>
                    👆 Clique para abrir a loja
                  </div>
                </MapTooltip>
              )}
            </div>
          );
        })()}

        {/* ── SPARKLE EFFECTS ── */}
        {sparkles.map((s) => (
          <div
            key={s.id}
            className="absolute pointer-events-none"
            style={{ left: `${s.x}%`, top: `${s.y}%`, zIndex: 50 }}
          >
            {["✨", "⭐", "💫", "✨"].map((star, i) => (
              <div
                key={i}
                className="absolute text-yellow-400"
                style={{
                  animation: `sparkle-fly 1s ease-out forwards`,
                  animationDelay: `${i * 0.1}s`,
                  transform: `rotate(${i * 90}deg)`,
                  fontSize: "1.2rem",
                }}
              >
                {star}
              </div>
            ))}
          </div>
        ))}

      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes sparkle-fly {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.5) rotate(180deg) translate(20px, -20px); opacity: 1; }
          100% { transform: scale(0) rotate(360deg) translate(40px, -40px); opacity: 0; }
        }
        @keyframes shop-pulse {
          0%, 100% { transform: translate(-2px, -2px) scale(1); opacity: 0.7; }
          50% { transform: translate(-2px, -2px) scale(1.25); opacity: 0.2; }
        }
        @keyframes kingdom-ring-outer {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; box-shadow: 0 0 8px rgba(245,200,66,0.6); }
          50% { transform: translate(-50%, -50%) scale(1.35); opacity: 0.1; box-shadow: 0 0 24px rgba(245,200,66,0.2); }
        }
        @keyframes kingdom-ring-inner {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
