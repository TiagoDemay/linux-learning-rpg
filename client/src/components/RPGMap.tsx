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
      `}</style>
    </div>
  );
}
