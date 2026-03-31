import { useState, useEffect } from "react";
import { LEVELS, canUnlock, type Level } from "../data/levels";
import { getTaskByLevel } from "../data/tasks";

interface RPGMapProps {
  unlockedLevels: string[];
  completedLevels: string[];
  currentLevel: string;
  coins: number;
  onSelectLevel: (level: Level) => void;
  onUnlockLevel: (level: Level) => void;
}

// Decorative animated elements
const SHIPS = [
  { x: 68, y: 60, delay: 0 },
  { x: 74, y: 68, delay: 1.5 },
];
const WAVES = [
  { x: 55, y: 58, delay: 0 },
  { x: 65, y: 65, delay: 0.8 },
  { x: 75, y: 72, delay: 1.6 },
  { x: 58, y: 75, delay: 0.4 },
];
const SEA_CREATURES = [
  { x: 52, y: 70, type: "octopus", delay: 0 },
  { x: 70, y: 80, type: "serpent", delay: 1 },
  { x: 80, y: 62, type: "serpent", delay: 2 },
];

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

export default function RPGMap({
  unlockedLevels,
  completedLevels,
  currentLevel,
  coins,
  onSelectLevel,
  onUnlockLevel,
}: RPGMapProps) {
  const [hoveredLevel, setHoveredLevel] = useState<string | null>(null);
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

  return (
    <div className="relative w-full" style={{ aspectRatio: "16/9", maxHeight: "calc(100vh - 80px)" }}>
      {/* Parchment background */}
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, #f5e6c8 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, #e8d5a3 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, #f0deb4 0%, #d4b896 100%)
          `,
        }}
      >
        {/* Parchment texture overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Aged spots */}
        <div className="absolute top-8 left-16 w-24 h-16 rounded-full opacity-10" style={{ background: "#8b6914" }} />
        <div className="absolute bottom-12 right-20 w-32 h-20 rounded-full opacity-10" style={{ background: "#6b4c0a" }} />
        <div className="absolute top-1/3 right-1/4 w-16 h-12 rounded-full opacity-8" style={{ background: "#7a5c1e" }} />

        {/* ── BIOME REGIONS ── */}
        {/* Forest region - top left */}
        <div className="absolute" style={{ left: "2%", top: "5%", width: "28%", height: "38%", background: "radial-gradient(ellipse, rgba(45,90,39,0.25) 0%, transparent 70%)", borderRadius: "60% 40% 50% 60%" }} />
        {/* Tundra - top center */}
        <div className="absolute" style={{ left: "28%", top: "2%", width: "30%", height: "32%", background: "radial-gradient(ellipse, rgba(168,216,234,0.3) 0%, transparent 70%)", borderRadius: "40% 60% 40% 50%" }} />
        {/* Mountains - top right */}
        <div className="absolute" style={{ left: "62%", top: "3%", width: "36%", height: "40%", background: "radial-gradient(ellipse, rgba(107,107,107,0.2) 0%, transparent 70%)", borderRadius: "50% 40% 60% 40%" }} />
        {/* Swamp - left */}
        <div className="absolute" style={{ left: "2%", top: "38%", width: "26%", height: "35%", background: "radial-gradient(ellipse, rgba(74,82,64,0.3) 0%, transparent 70%)", borderRadius: "40% 60% 50% 40%" }} />
        {/* Kingdom - center */}
        <div className="absolute" style={{ left: "30%", top: "25%", width: "32%", height: "40%", background: "radial-gradient(ellipse, rgba(139,69,19,0.15) 0%, transparent 70%)", borderRadius: "50%" }} />
        {/* Plains - right */}
        <div className="absolute" style={{ left: "68%", top: "28%", width: "30%", height: "35%", background: "radial-gradient(ellipse, rgba(192,57,43,0.15) 0%, transparent 70%)", borderRadius: "40% 60% 50% 40%" }} />
        {/* Desert - center-bottom */}
        <div className="absolute" style={{ left: "18%", top: "52%", width: "32%", height: "32%", background: "radial-gradient(ellipse, rgba(212,160,23,0.25) 0%, transparent 70%)", borderRadius: "50% 40% 60% 40%" }} />
        {/* Ocean - bottom */}
        <div className="absolute" style={{ left: "42%", top: "50%", width: "56%", height: "48%", background: "radial-gradient(ellipse, rgba(26,82,118,0.2) 0%, rgba(52,152,219,0.15) 60%, transparent 100%)", borderRadius: "40% 60% 40% 60%" }} />

        {/* ── OCEAN WAVES ── */}
        {WAVES.map((w, i) => (
          <div
            key={i}
            className="absolute text-blue-400 opacity-40 select-none"
            style={{
              left: `${w.x}%`,
              top: `${w.y}%`,
              fontSize: "1.2rem",
              animation: `wave ${2 + w.delay}s ease-in-out infinite`,
              animationDelay: `${w.delay}s`,
            }}
          >
            〰
          </div>
        ))}

        {/* ── SHIPS ── */}
        {SHIPS.map((s, i) => (
          <div
            key={i}
            className="absolute select-none"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              fontSize: "1.6rem",
              animation: `sail ${4 + s.delay}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
              filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.3))",
            }}
          >
            ⛵
          </div>
        ))}

        {/* ── SEA CREATURES ── */}
        {SEA_CREATURES.map((c, i) => (
          <div
            key={i}
            className="absolute select-none opacity-60"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              fontSize: c.type === "octopus" ? "1.8rem" : "1.4rem",
              animation: `float ${3 + c.delay}s ease-in-out infinite`,
              animationDelay: `${c.delay}s`,
            }}
          >
            {c.type === "octopus" ? "🐙" : "🐍"}
          </div>
        ))}

        {/* ── TUX PENGUIN (mascot) ── */}
        <div
          className="absolute select-none"
          style={{
            left: "44%",
            top: "52%",
            fontSize: "2.2rem",
            animation: "tuxBob 2s ease-in-out infinite",
            filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.4))",
            zIndex: 5,
          }}
        >
          🐧
        </div>

        {/* ── CONNECTION PATHS (SVG) ── */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ zIndex: 1 }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 Z" fill="#8b6914" opacity="0.6" />
            </marker>
          </defs>
          {CONNECTIONS.map(([fromId, toId]) => {
            const from = getLevelById(fromId);
            const to = getLevelById(toId);
            if (!from || !to) return null;
            const isActive =
              unlockedLevels.includes(fromId) && unlockedLevels.includes(toId);
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isActive ? "#8b6914" : "#c4a96a"}
                strokeWidth={isActive ? "0.5" : "0.3"}
                strokeDasharray={isActive ? "none" : "1,1"}
                opacity={isActive ? 0.8 : 0.4}
                markerEnd={isActive ? "url(#arrowhead)" : undefined}
              />
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
              onMouseEnter={() => setHoveredLevel(level.id)}
              onMouseLeave={() => setHoveredLevel(null)}
              onClick={() => handleLevelClick(level)}
            >
              {/* Node circle */}
              <div
                className="flex flex-col items-center gap-0.5"
                style={{
                  border: style.border,
                  borderRadius: "50%",
                  width: "52px",
                  height: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: style.background,
                  boxShadow: style.shadow,
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
                  color: style.textColor,
                  textShadow: "1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8)",
                  maxWidth: "80px",
                  lineHeight: 1.2,
                  background: "rgba(240,222,180,0.7)",
                  padding: "1px 4px",
                  borderRadius: "3px",
                  border: "1px solid rgba(139,105,20,0.3)",
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

              {/* Tooltip on hover */}
              {isHovered && (
                <div
                  className="absolute z-30 rounded-lg p-3 shadow-xl"
                  style={{
                    bottom: "calc(100% + 12px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "180px",
                    background: "rgba(62,39,20,0.95)",
                    border: "2px solid #8b6914",
                    color: "#f0deb4",
                    fontSize: "0.7rem",
                    lineHeight: 1.4,
                  }}
                >
                  <div className="font-bold mb-1" style={{ fontFamily: "'MedievalSharp', serif", fontSize: "0.75rem", color: "#f5c842" }}>
                    {level.icon} {level.name}
                  </div>
                  <div className="mb-2 opacity-90">{level.description.slice(0, 80)}...</div>
                  {task && (
                    <div className="border-t border-yellow-700 pt-1 mt-1">
                      <span className="text-yellow-400 font-bold">Missão:</span> {task.title}
                    </div>
                  )}
                  <div className="mt-1">
                    {status === "completed" && <span className="text-green-400">✓ Concluído</span>}
                    {status === "current" && <span className="text-yellow-400">▶ Em progresso</span>}
                    {status === "unlocked" && <span className="text-blue-300">🔓 Desbloqueado</span>}
                    {status === "available" && <span className="text-green-300">🪙 Custo: {level.unlockCost} moedas</span>}
                    {status === "locked" && <span className="text-gray-400">🔒 Bloqueado</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}

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

        {/* ── COMPASS ROSE ── */}
        <div
          className="absolute select-none"
          style={{
            left: "3%",
            bottom: "8%",
            width: "80px",
            height: "80px",
            zIndex: 15,
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Outer circle */}
            <circle cx="50" cy="50" r="48" fill="rgba(240,222,180,0.9)" stroke="#8b6914" strokeWidth="2" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#8b6914" strokeWidth="0.5" />
            {/* Cardinal directions */}
            <polygon points="50,5 45,45 55,45" fill="#c0392b" />
            <polygon points="50,95 45,55 55,55" fill="#3d2b1f" />
            <polygon points="5,50 45,45 45,55" fill="#3d2b1f" />
            <polygon points="95,50 55,45 55,55" fill="#3d2b1f" />
            {/* Center */}
            <circle cx="50" cy="50" r="5" fill="#8b6914" />
            {/* Labels */}
            <text x="50" y="18" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#c0392b" fontFamily="serif">N</text>
            <text x="50" y="90" textAnchor="middle" fontSize="10" fill="#3d2b1f" fontFamily="serif">S</text>
            <text x="12" y="54" textAnchor="middle" fontSize="10" fill="#3d2b1f" fontFamily="serif">W</text>
            <text x="88" y="54" textAnchor="middle" fontSize="10" fill="#3d2b1f" fontFamily="serif">E</text>
          </svg>
        </div>

        {/* ── TITLE BANNER ── */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
          style={{ width: "55%", textAlign: "center" }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #5c3d1e 0%, #8b6914 30%, #c9a227 50%, #8b6914 70%, #5c3d1e 100%)",
              border: "3px solid #3d2b1f",
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
              padding: "6px 24px 10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
              position: "relative",
            }}
          >
            {/* Ribbon ends */}
            <div className="absolute -left-3 top-2 w-3 h-4" style={{ background: "#3d2b1f", clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 70%)" }} />
            <div className="absolute -right-3 top-2 w-3 h-4" style={{ background: "#3d2b1f", clipPath: "polygon(0 0, 100% 0, 50% 70%, 0 100%)" }} />
            <div
              style={{
                fontFamily: "'MedievalSharp', serif",
                fontSize: "clamp(0.7rem, 1.8vw, 1.1rem)",
                color: "#f5e6c8",
                textShadow: "1px 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(255,200,50,0.3)",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              ⚔ MAPA MUNDI: TERRAS DO KERNEL ⚔
            </div>
          </div>
        </div>

        {/* ── DECORATIVE BORDER ── */}
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            border: "8px solid transparent",
            borderImage: "linear-gradient(45deg, #5c3d1e, #8b6914, #c9a227, #8b6914, #5c3d1e) 1",
            boxShadow: "inset 0 0 0 2px rgba(139,105,20,0.5), 0 0 0 2px rgba(139,105,20,0.3)",
          }}
        />
        {/* Corner decorations */}
        {["top-1 left-1", "top-1 right-1", "bottom-1 left-1", "bottom-1 right-1"].map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-10 h-10 pointer-events-none`}
            style={{
              background: "radial-gradient(circle, #c9a227 0%, #8b6914 50%, transparent 70%)",
              opacity: 0.6,
              borderRadius: i < 2 ? (i === 0 ? "0 0 100% 0" : "0 0 0 100%") : (i === 2 ? "0 100% 0 0" : "100% 0 0 0"),
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleX(1) translateY(0); }
          50% { transform: scaleX(1.2) translateY(-2px); }
        }
        @keyframes sail {
          0%, 100% { transform: translateX(0) rotate(-2deg); }
          50% { transform: translateX(8px) rotate(2deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-6px) rotate(5deg); }
        }
        @keyframes tuxBob {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-4px) rotate(3deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes sparkle-fly {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.5) rotate(180deg) translate(20px, -20px); opacity: 1; }
          100% { transform: scale(0) rotate(360deg) translate(40px, -40px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
