import { LEVELS } from "../data/levels";
import { getLoginUrl } from "../const";
import type { User } from "../../../drizzle/schema";

type View = "map" | "terminal" | "ranking";

interface HUDProps {
  coins: number;
  completedLevels: string[];
  currentLevel: string;
  view: View;
  onViewChange: (view: View) => void;
  onResetGame: () => void;
  user: User | null | undefined;
  isAuthenticated: boolean;
}

export default function HUD({
  coins,
  completedLevels,
  currentLevel,
  view,
  onViewChange,
  onResetGame,
  user,
  isAuthenticated,
}: HUDProps) {
  const totalLevels = LEVELS.length;
  const progress = (completedLevels.length / totalLevels) * 100;
  const currentLevelData = LEVELS.find((l) => l.id === currentLevel);

  return (
    <div
      className="flex items-center justify-between px-4 py-2 flex-shrink-0"
      style={{
        background: "linear-gradient(135deg, #2c1810 0%, #3d2b1f 50%, #2c1810 100%)",
        borderBottom: "3px solid #8b6914",
        boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
        minHeight: "56px",
      }}
    >
      {/* Left: Title + current level */}
      <div className="flex items-center gap-3">
        <div
          style={{
            fontFamily: "'MedievalSharp', serif",
            color: "#c9a227",
            fontSize: "clamp(0.7rem, 1.5vw, 1rem)",
            textShadow: "0 0 8px rgba(201,162,39,0.5)",
            whiteSpace: "nowrap",
          }}
        >
          ⚔ Terras do Kernel
        </div>
        {currentLevelData && (
          <div
            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded"
            style={{
              background: "rgba(139,105,20,0.3)",
              border: "1px solid #8b6914",
              color: "#f0deb4",
              fontSize: "0.7rem",
            }}
          >
            <span>{currentLevelData.icon}</span>
            <span style={{ fontFamily: "'MedievalSharp', serif" }}>{currentLevelData.name}</span>
          </div>
        )}
      </div>

      {/* Center: Progress bar */}
      <div className="flex flex-col items-center gap-1 flex-1 mx-4 max-w-xs">
        <div className="flex items-center gap-2 w-full">
          <span style={{ color: "#8b6914", fontSize: "0.65rem", whiteSpace: "nowrap" }}>Progresso</span>
          <div
            className="flex-1 rounded-full overflow-hidden"
            style={{ height: "8px", background: "rgba(139,105,20,0.3)", border: "1px solid #8b6914" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #27ae60, #2ecc71)",
                boxShadow: "0 0 6px rgba(39,174,96,0.6)",
              }}
            />
          </div>
          <span style={{ color: "#c9a227", fontSize: "0.65rem", whiteSpace: "nowrap" }}>
            {completedLevels.length}/{totalLevels}
          </span>
        </div>
        {/* Level dots */}
        <div className="flex gap-1">
          {LEVELS.map((level) => (
            <div
              key={level.id}
              title={level.name}
              className="rounded-full transition-all duration-300"
              style={{
                width: "8px",
                height: "8px",
                background: completedLevels.includes(level.id)
                  ? "#27ae60"
                  : level.id === currentLevel
                  ? "#f39c12"
                  : "rgba(139,105,20,0.4)",
                border: level.id === currentLevel ? "1px solid #f39c12" : "1px solid rgba(139,105,20,0.3)",
                boxShadow: completedLevels.includes(level.id) ? "0 0 4px rgba(39,174,96,0.6)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* Right: Coins + Auth + Navigation */}
      <div className="flex items-center gap-2">
        {/* Coin display */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: "linear-gradient(135deg, rgba(201,162,39,0.2), rgba(139,105,20,0.3))",
            border: "2px solid #8b6914",
            boxShadow: "0 0 8px rgba(201,162,39,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <span className="text-lg" style={{ animation: coins > 0 ? "coin-spin 3s linear infinite" : "none" }}>
            🪙
          </span>
          <div className="flex flex-col items-end">
            <span
              style={{
                fontFamily: "'MedievalSharp', serif",
                color: "#c9a227",
                fontSize: "clamp(0.75rem, 1.5vw, 1rem)",
                fontWeight: "bold",
                textShadow: "0 0 6px rgba(201,162,39,0.4)",
                lineHeight: 1,
              }}
            >
              {coins.toLocaleString()}
            </span>
            <span style={{ color: "#8b6914", fontSize: "0.55rem" }}>moedas</span>
          </div>
        </div>

        {/* Auth: login button or user name */}
        {!isAuthenticated ? (
          <a
            href={getLoginUrl()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, rgba(201,162,39,0.25), rgba(139,105,20,0.35))",
              border: "1px solid #8b6914",
              color: "#c9a227",
              textDecoration: "none",
            }}
          >
            🔐 Entrar
          </a>
        ) : (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{
              background: "rgba(39,174,96,0.15)",
              border: "1px solid #27ae60",
              color: "#2ecc71",
              fontSize: "0.65rem",
              maxWidth: "120px",
            }}
          >
            <span>✅</span>
            <span className="truncate" title={user?.name ?? ""}>{user?.name ?? "Aventureiro"}</span>
          </div>
        )}

        {/* Ranking button */}
        <button
          onClick={() => onViewChange("ranking")}
          title="Ver Ranking"
          className="px-2 py-1.5 rounded transition-all hover:scale-105"
          style={{
            background: view === "ranking" ? "linear-gradient(135deg, #8b6914, #c9a227)" : "rgba(139,105,20,0.2)",
            border: "1px solid #8b6914",
            color: view === "ranking" ? "#f5e6c8" : "#c9a227",
            fontSize: "0.75rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          🏆
        </button>

        {/* Reset game button — visível apenas para admin */}
        {user?.role === "admin" && (
          <button
            onClick={() => {
              if (window.confirm("Reiniciar o jogo do zero? Todo o progresso e moedas serão perdidos.")) {
                onResetGame();
              }
            }}
            title="Reiniciar Jogo (Admin)"
            className="px-2 py-1.5 rounded transition-all hover:scale-105 hover:opacity-90"
            style={{
              background: "rgba(180,40,40,0.18)",
              border: "1px solid #8b2020",
              color: "#ff8080",
              fontSize: "0.7rem",
              cursor: "pointer",
            }}
          >
            🔄
          </button>
        )}

        {/* View toggle */}
        <div className="flex rounded overflow-hidden" style={{ border: "2px solid #8b6914" }}>
          <button
            onClick={() => onViewChange("map")}
            className="px-3 py-1.5 text-xs font-bold transition-all"
            style={{
              fontFamily: "'MedievalSharp', serif",
              fontSize: "0.65rem",
              background: view === "map" ? "linear-gradient(135deg, #8b6914, #c9a227)" : "rgba(139,105,20,0.2)",
              color: view === "map" ? "#f5e6c8" : "#8b6914",
              borderRight: "1px solid #8b6914",
            }}
          >
            🗺️ Mapa
          </button>
          <button
            onClick={() => onViewChange("terminal")}
            className="px-3 py-1.5 text-xs font-bold transition-all"
            style={{
              fontFamily: "'MedievalSharp', serif",
              fontSize: "0.65rem",
              background: view === "terminal" ? "linear-gradient(135deg, #8b6914, #c9a227)" : "rgba(139,105,20,0.2)",
              color: view === "terminal" ? "#f5e6c8" : "#8b6914",
            }}
          >
            💻 Terminal
          </button>
        </div>
      </div>

      <style>{`
        @keyframes coin-spin {
          0%, 80%, 100% { transform: rotateY(0deg); }
          85% { transform: rotateY(180deg); }
          90% { transform: rotateY(360deg); }
        }
      `}</style>
    </div>
  );
}
