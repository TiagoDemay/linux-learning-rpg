import { useState, useCallback, useEffect } from "react";
import { createInitialVFS, type VFSState } from "../lib/terminal-logic";
import { LEVELS, canUnlock, type Level } from "../data/levels";
import RPGMap from "../components/RPGMap";
import Terminal from "../components/Terminal";
import HUD from "../components/HUD";
import UnlockModal from "../components/UnlockModal";
import SparkleEffect from "../components/SparkleEffect";

type View = "map" | "terminal";

interface GameState {
  coins: number;
  unlockedLevels: string[];
  completedLevels: string[];
  currentLevel: string;
}

const STORAGE_KEY = "terras-do-kernel-save";

function loadGameState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    coins: 0,
    unlockedLevels: ["floresta-stallman"],
    completedLevels: [],
    currentLevel: "floresta-stallman",
  };
}

function saveGameState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export default function Home() {
  const [view, setView] = useState<View>("map");
  const [gameState, setGameState] = useState<GameState>(loadGameState);
  const [vfs, setVfs] = useState<VFSState>(createInitialVFS);
  const [pendingUnlock, setPendingUnlock] = useState<Level | null>(null);
  const [sparkleActive, setSparkleActive] = useState(false);
  const [sparkleMessage, setSparkleMessage] = useState("");
  const [coinAnimation, setCoinAnimation] = useState(false);

  // Persist game state
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  const handleSelectLevel = useCallback((level: Level) => {
    setGameState((prev) => ({ ...prev, currentLevel: level.id }));
    setView("terminal");
  }, []);

  const handleUnlockLevel = useCallback((level: Level) => {
    setPendingUnlock(level);
  }, []);

  const confirmUnlock = useCallback(() => {
    if (!pendingUnlock) return;
    const level = pendingUnlock;
    setPendingUnlock(null);

    setGameState((prev) => {
      if (prev.coins < level.unlockCost) return prev;
      const newState = {
        ...prev,
        coins: prev.coins - level.unlockCost,
        unlockedLevels: [...prev.unlockedLevels, level.id],
        currentLevel: level.id,
      };
      return newState;
    });

    setSparkleMessage(`${level.icon} ${level.name} Desbloqueado!`);
    setSparkleActive(true);
    setTimeout(() => setView("terminal"), 1500);
  }, [pendingUnlock]);

  const handleTaskComplete = useCallback((levelId: string, reward: number) => {
    setGameState((prev) => {
      if (prev.completedLevels.includes(levelId)) return prev;
      return {
        ...prev,
        coins: prev.coins + reward,
        completedLevels: [...prev.completedLevels, levelId],
      };
    });
    setCoinAnimation(true);
    setTimeout(() => setCoinAnimation(false), 1000);
  }, []);

  const handleVFSChange = useCallback((newVFS: VFSState) => {
    setVfs(newVFS);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const handleBackToMap = useCallback(() => {
    setView("map");
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, #1a0f0a 0%, #2c1810 50%, #1a0f0a 100%)",
        overflow: "hidden",
      }}
    >
      {/* HUD - always visible */}
      <HUD
        coins={gameState.coins}
        completedLevels={gameState.completedLevels}
        currentLevel={gameState.currentLevel}
        view={view}
        onViewChange={handleViewChange}
      />

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        {view === "map" ? (
          <div
            className="w-full h-full flex items-center justify-center p-3"
            style={{ background: "linear-gradient(135deg, #1a0f0a 0%, #2c1810 100%)" }}
          >
            <div className="w-full h-full max-w-7xl">
              <RPGMap
                unlockedLevels={gameState.unlockedLevels}
                completedLevels={gameState.completedLevels}
                currentLevel={gameState.currentLevel}
                coins={gameState.coins}
                onSelectLevel={handleSelectLevel}
                onUnlockLevel={handleUnlockLevel}
              />
            </div>
          </div>
        ) : (
          <div className="w-full h-full">
            <Terminal
              currentLevel={gameState.currentLevel}
              vfs={vfs}
              onVFSChange={handleVFSChange}
              onTaskComplete={handleTaskComplete}
              completedLevels={gameState.completedLevels}
              onBackToMap={handleBackToMap}
            />
          </div>
        )}
      </div>

      {/* Unlock modal */}
      <UnlockModal
        level={pendingUnlock}
        coins={gameState.coins}
        onConfirm={confirmUnlock}
        onCancel={() => setPendingUnlock(null)}
      />

      {/* Sparkle effect */}
      <SparkleEffect
        active={sparkleActive}
        message={sparkleMessage}
        onDone={() => setSparkleActive(false)}
      />

      {/* Coin earn floating animation */}
      {coinAnimation && (
        <div
          className="fixed top-16 right-8 z-40 pointer-events-none font-bold text-yellow-400 text-xl"
          style={{ animation: "float-up 1s ease-out forwards" }}
        >
          +🪙
        </div>
      )}

      {/* Welcome overlay for first visit */}
      <WelcomeOverlay
        show={gameState.completedLevels.length === 0 && gameState.coins === 0}
      />

      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-60px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function WelcomeOverlay({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show);
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="relative rounded-2xl p-8 max-w-lg w-full mx-4 text-center"
        style={{
          background: "linear-gradient(135deg, #2c1810 0%, #3d2b1f 100%)",
          border: "3px solid #8b6914",
          boxShadow: "0 0 60px rgba(201,162,39,0.3)",
        }}
      >
        {/* Decorative corners */}
        {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos, i) => (
          <div key={i} className={`absolute ${pos} text-yellow-600 text-xl opacity-50`}>✦</div>
        ))}

        <div className="text-6xl mb-4">🐧</div>
        <h1
          className="mb-3"
          style={{
            fontFamily: "'MedievalSharp', serif",
            color: "#c9a227",
            fontSize: "1.4rem",
            textShadow: "0 0 10px rgba(201,162,39,0.5)",
          }}
        >
          Bem-vindo às Terras do Kernel!
        </h1>
        <p style={{ color: "#d4b896", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1rem" }}>
          Você é um aventureiro em busca do domínio do Linux. Explore o mapa, complete missões no terminal e desbloqueie novos territórios com as moedas que ganhar.
        </p>
        <div
          className="rounded-lg p-3 mb-4 text-left"
          style={{ background: "rgba(139,105,20,0.2)", border: "1px solid #8b6914" }}
        >
          <div style={{ color: "#c9a227", fontWeight: "bold", fontSize: "0.8rem", marginBottom: "6px" }}>
            🗺️ Como Jogar:
          </div>
          <div style={{ color: "#d4b896", fontSize: "0.75rem", lineHeight: 1.8 }}>
            1. Clique em um local no mapa para entrar no terminal<br />
            2. Complete a missão usando comandos Linux<br />
            3. Ganhe moedas e desbloqueie novos territórios<br />
            4. Conquiste todas as 10 regiões das Terras do Kernel!
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="w-full py-3 rounded-xl font-bold text-lg transition-all hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #8b6914, #c9a227)",
            color: "#f5e6c8",
            fontFamily: "'MedievalSharp', serif",
            border: "none",
            boxShadow: "0 4px 12px rgba(201,162,39,0.3)",
          }}
        >
          ⚔ Começar a Aventura!
        </button>
      </div>
    </div>
  );
}
