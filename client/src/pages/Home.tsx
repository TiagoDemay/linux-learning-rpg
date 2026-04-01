import { useState, useCallback, useEffect, useRef } from "react";
import { createInitialVFS, type VFSState } from "../lib/terminal-logic";
import { LEVELS, canUnlock, type Level } from "../data/levels";
import RPGMap from "../components/RPGMap";
import Terminal from "../components/Terminal";
import HUD from "../components/HUD";
import UnlockModal from "../components/UnlockModal";
import SparkleEffect from "../components/SparkleEffect";
import { trpc } from "../lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";
import { getLoginUrl } from "../const";

type View = "map" | "terminal" | "ranking";

interface GameState {
  coins: number;
  unlockedLevels: string[];
  completedLevels: string[];
  currentLevel: string;
  challengeProgress: Record<string, number>;
}

const STORAGE_KEY = "terras-do-kernel-save";

function loadGameState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { challengeProgress: {}, ...parsed };
    }
  } catch {}
  return {
    coins: 0,
    unlockedLevels: ["floresta-stallman"],
    completedLevels: [],
    currentLevel: "floresta-stallman",
    challengeProgress: {},
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
  const [coinAnimation, setCoinAnimation] = useState<number | null>(null);

  const { user, isAuthenticated } = useAuth();

  // tRPC: carregar progresso do banco ao logar
  const { data: serverProgress } = trpc.progress.get.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  // tRPC: salvar progresso
  const saveProgressMutation = trpc.progress.save.useMutation();

  // Sincronizar: quando carrega progresso do servidor, mesclar com localStorage
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!serverProgress || syncedRef.current) return;
    syncedRef.current = true;

    setGameState((local) => {
      // Usa o estado com mais moedas (evita regressão)
      if (serverProgress.coins >= local.coins) {
        const merged: GameState = {
          coins: serverProgress.coins,
          unlockedLevels: serverProgress.unlockedLevels,
          completedLevels: serverProgress.completedLevels,
          currentLevel: serverProgress.currentLevel,
          challengeProgress: serverProgress.challengeProgress,
        };
        saveGameState(merged);
        return merged;
      }
      // Local tem mais moedas: salvar local no servidor
      saveProgressMutation.mutate({
        coins: local.coins,
        unlockedLevels: local.unlockedLevels,
        completedLevels: local.completedLevels,
        currentLevel: local.currentLevel,
        challengeProgress: local.challengeProgress,
      });
      return local;
    });
  }, [serverProgress]);

  // Persist local
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  // Auto-save no servidor a cada mudança (debounced via useEffect)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProgressMutation.mutate({
        coins: gameState.coins,
        unlockedLevels: gameState.unlockedLevels,
        completedLevels: gameState.completedLevels,
        currentLevel: gameState.currentLevel,
        challengeProgress: gameState.challengeProgress,
      });
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [gameState, isAuthenticated]);

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
      return {
        ...prev,
        coins: prev.coins - level.unlockCost,
        unlockedLevels: [...prev.unlockedLevels, level.id],
        currentLevel: level.id,
      };
    });
    setSparkleMessage(`${level.icon} ${level.name} Desbloqueado!`);
    setSparkleActive(true);
    setTimeout(() => setView("terminal"), 1500);
  }, [pendingUnlock]);

  const handleChallengeComplete = useCallback(
    (levelId: string, challengeIndex: number, reward: number, isLastChallenge: boolean) => {
      setGameState((prev) => {
        const newProgress = { ...prev.challengeProgress, [levelId]: challengeIndex + 1 };
        const newCompletedLevels =
          isLastChallenge && !prev.completedLevels.includes(levelId)
            ? [...prev.completedLevels, levelId]
            : prev.completedLevels;
        return { ...prev, coins: prev.coins + reward, challengeProgress: newProgress, completedLevels: newCompletedLevels };
      });
      setCoinAnimation(reward);
      setTimeout(() => setCoinAnimation(null), 1200);
    },
    []
  );

  const handleTaskComplete = useCallback(
    (levelId: string, reward: number) => {
      handleChallengeComplete(levelId, 0, reward, true);
    },
    [handleChallengeComplete]
  );

  const handleVFSChange = useCallback((newVFS: VFSState) => { setVfs(newVFS); }, []);
  const handleViewChange = useCallback((newView: View) => { setView(newView); }, []);
  const handleBackToMap = useCallback(() => { setView("map"); }, []);


  const handleResetGame = useCallback(() => {
    const fresh: GameState = {
      coins: 0,
      unlockedLevels: ["floresta-stallman"],
      completedLevels: [],
      currentLevel: "floresta-stallman",
      challengeProgress: {},
    };
    setGameState(fresh);
    setVfs(createInitialVFS());
    setView("map");
    saveGameState(fresh);
    syncedRef.current = false;
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{ height: "100vh", background: "linear-gradient(135deg, #1a0f0a 0%, #2c1810 50%, #1a0f0a 100%)", overflow: "hidden" }}
    >
      <HUD
        coins={gameState.coins}
        completedLevels={gameState.completedLevels}
        currentLevel={gameState.currentLevel}
        view={view}
        onViewChange={handleViewChange}
        onResetGame={handleResetGame}
        user={user}
        isAuthenticated={isAuthenticated}
      />

      <div className="flex-1 overflow-hidden relative">
        {view === "map" && (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a0f0a 0%, #2c1810 100%)", padding: "8px" }}>
            <div style={{ width: "100%", height: "100%", maxWidth: "min(100%, calc((100vh - 72px) * 16 / 9))", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        )}
        {view === "terminal" && (
          <div className="w-full h-full">
            <Terminal
              currentLevel={gameState.currentLevel}
              vfs={vfs}
              onVFSChange={handleVFSChange}
              onTaskComplete={handleTaskComplete}
              onChallengeComplete={handleChallengeComplete}
              completedLevels={gameState.completedLevels}
              challengeProgress={gameState.challengeProgress}
              onBackToMap={handleBackToMap}
            />
          </div>
        )}
        {view === "ranking" && (
          <RankingView
            onBack={() => setView("map")}
            myCoins={gameState.coins}
            isAuthenticated={isAuthenticated}
            userName={user?.name ?? null}
          />
        )}
      </div>

      <UnlockModal level={pendingUnlock} coins={gameState.coins} onConfirm={confirmUnlock} onCancel={() => setPendingUnlock(null)} />
      <SparkleEffect active={sparkleActive} message={sparkleMessage} onDone={() => setSparkleActive(false)} />

      {coinAnimation !== null && (
        <div className="fixed top-16 right-8 z-40 pointer-events-none font-bold text-yellow-400 text-xl" style={{ animation: "float-up 1.2s ease-out forwards" }}>
          +{coinAnimation} 🪙
        </div>
      )}

      <WelcomeOverlay show={gameState.completedLevels.length === 0 && gameState.coins === 0} />

      <style>{`
        @keyframes float-up { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-60px); opacity: 0; } }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Tela de Ranking
// ─────────────────────────────────────────────────────────
function RankingView({ onBack, myCoins, isAuthenticated, userName }: {
  onBack: () => void;
  myCoins: number;
  isAuthenticated: boolean;
  userName: string | null;
}) {
  const { data: ranking, isLoading } = trpc.ranking.getTop.useQuery({ limit: 20 });

  const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
  const medals = ["🥇", "🥈", "🥉"];

  const levelNames: Record<string, string> = {
    "floresta-stallman": "Floresta de Stallman",
    "tundra-slackware": "Tundra do Slackware",
    "montanhas-kernighan": "Montanhas de Kernighan",
    "pantano-systemd": "Pântano de Systemd",
    "reino-torvalds": "Reino de Torvalds",
    "cidade-gnu": "Cidade Livre de GNU",
    "planicies-redhat": "Planícies de RedHat",
    "deserto-debian": "Deserto de Debian",
    "ilhas-canonical": "Ilhas de Canonical",
    "vale-arch": "Vale do Arch Linux",
  };

  return (
    <div
      className="w-full h-full overflow-y-auto"
      style={{ background: "linear-gradient(135deg, #1a0f0a 0%, #2c1810 100%)" }}
    >
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:scale-105"
            style={{ background: "rgba(139,105,20,0.3)", border: "1px solid #8b6914", color: "#c9a227" }}
          >
            ← Voltar
          </button>
          <h1 style={{ fontFamily: "'MedievalSharp', serif", color: "#c9a227", fontSize: "1.5rem", textShadow: "0 0 10px rgba(201,162,39,0.5)" }}>
            🏆 Ranking dos Aventureiros
          </h1>
        </div>

        {/* Login banner */}
        {!isAuthenticated && (
          <div
            className="rounded-xl p-4 mb-6 text-center"
            style={{ background: "rgba(139,105,20,0.2)", border: "2px dashed #8b6914" }}
          >
            <div style={{ color: "#c9a227", fontWeight: "bold", marginBottom: "8px" }}>
              🔐 Entre para aparecer no ranking!
            </div>
            <p style={{ color: "#d4b896", fontSize: "0.8rem", marginBottom: "12px" }}>
              Faça login para salvar seu progresso e competir com outros aventureiros.
            </p>
            <a
              href={getLoginUrl()}
              className="inline-block px-6 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #8b6914, #c9a227)", color: "#1a0f0a" }}
            >
              ⚔ Entrar / Cadastrar
            </a>
          </div>
        )}

        {/* My score (if authenticated) */}
        {isAuthenticated && (
          <div
            className="rounded-xl p-4 mb-6 flex items-center justify-between"
            style={{ background: "rgba(201,162,39,0.15)", border: "2px solid #8b6914" }}
          >
            <div>
              <div style={{ color: "#c9a227", fontWeight: "bold", fontSize: "0.9rem" }}>Seu Progresso</div>
              <div style={{ color: "#d4b896", fontSize: "0.8rem" }}>{userName ?? "Aventureiro"}</div>
            </div>
            <div className="text-right">
              <div style={{ color: "#FFD700", fontWeight: "bold", fontSize: "1.2rem" }}>🪙 {myCoins}</div>
              <div style={{ color: "#d4b896", fontSize: "0.7rem" }}>moedas</div>
            </div>
          </div>
        )}

        {/* Ranking table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "2px solid #5c3d1e" }}>
          {/* Table header */}
          <div
            className="grid grid-cols-12 px-4 py-2 text-xs font-bold"
            style={{ background: "rgba(139,105,20,0.4)", color: "#c9a227", borderBottom: "1px solid #5c3d1e" }}
          >
            <div className="col-span-1">#</div>
            <div className="col-span-5">Aventureiro</div>
            <div className="col-span-3 text-center">Moedas</div>
            <div className="col-span-3 text-right">Territórios</div>
          </div>

          {isLoading && (
            <div className="py-12 text-center" style={{ color: "#8b6914" }}>
              <div className="text-2xl mb-2">⏳</div>
              <div style={{ fontFamily: "'MedievalSharp', serif" }}>Consultando os pergaminhos...</div>
            </div>
          )}

          {!isLoading && (!ranking || ranking.length === 0) && (
            <div className="py-12 text-center" style={{ color: "#8b6914" }}>
              <div className="text-3xl mb-2">📜</div>
              <div style={{ fontFamily: "'MedievalSharp', serif", color: "#c9a227" }}>Nenhum aventureiro ainda!</div>
              <div style={{ color: "#d4b896", fontSize: "0.8rem", marginTop: "8px" }}>Seja o primeiro a entrar no ranking.</div>
            </div>
          )}

          {ranking?.map((player, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 px-4 py-3 items-center transition-all hover:bg-yellow-900/10"
              style={{
                borderBottom: idx < ranking.length - 1 ? "1px solid rgba(92,61,30,0.5)" : "none",
                background: idx === 0 ? "rgba(255,215,0,0.05)" : idx === 1 ? "rgba(192,192,192,0.05)" : idx === 2 ? "rgba(205,127,50,0.05)" : "transparent",
              }}
            >
              {/* Position */}
              <div className="col-span-1 text-lg font-bold" style={{ color: medalColors[idx] ?? "#d4b896" }}>
                {idx < 3 ? medals[idx] : `${player.position}`}
              </div>

              {/* Name */}
              <div className="col-span-5">
                <div style={{ color: "#f5e6c8", fontWeight: "bold", fontSize: "0.85rem" }}>
                  {player.name}
                </div>
                <div style={{ color: "#8b6914", fontSize: "0.65rem" }}>
                  {levelNames[player.currentLevel] ?? player.currentLevel}
                </div>
              </div>

              {/* Coins */}
              <div className="col-span-3 text-center">
                <span style={{ color: "#FFD700", fontWeight: "bold", fontSize: "0.9rem" }}>
                  🪙 {player.coins.toLocaleString("pt-BR")}
                </span>
              </div>

              {/* Completed levels */}
              <div className="col-span-3 text-right">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: "rgba(139,105,20,0.3)", color: "#c9a227", border: "1px solid #8b6914" }}
                >
                  {player.completedCount}/10
                </span>
              </div>
            </div>
          ))}
        </div>

        <p style={{ color: "#5c3d1e", fontSize: "0.65rem", textAlign: "center", marginTop: "16px" }}>
          Atualizado em tempo real • Top 20 aventureiros por moedas
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Welcome Overlay
// ─────────────────────────────────────────────────────────
function WelcomeOverlay({ show }: { show: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const { isAuthenticated } = useAuth();

  if (!show || dismissed) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
      <div
        className="relative rounded-2xl p-8 max-w-lg w-full mx-4 text-center"
        style={{ background: "linear-gradient(135deg, #2c1810 0%, #3d2b1f 100%)", border: "3px solid #8b6914", boxShadow: "0 0 60px rgba(201,162,39,0.3)" }}
      >
        {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos, i) => (
          <div key={i} className={`absolute ${pos} text-yellow-600 text-xl opacity-50`}>✦</div>
        ))}

        <div className="text-6xl mb-4">🐧</div>
        <h1 className="mb-3" style={{ fontFamily: "'MedievalSharp', serif", color: "#c9a227", fontSize: "1.4rem", textShadow: "0 0 10px rgba(201,162,39,0.5)" }}>
          Bem-vindo às Terras do Kernel!
        </h1>
        <p style={{ color: "#d4b896", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1rem" }}>
          Você é um aventureiro em busca do domínio do Linux. Explore o mapa, complete missões no terminal e desbloqueie novos territórios com as moedas que ganhar.
        </p>
        <div className="rounded-lg p-3 mb-4 text-left" style={{ background: "rgba(139,105,20,0.2)", border: "1px solid #8b6914" }}>
          <div style={{ color: "#c9a227", fontWeight: "bold", fontSize: "0.8rem", marginBottom: "6px" }}>🗺️ Como Jogar:</div>
          <div style={{ color: "#d4b896", fontSize: "0.75rem", lineHeight: 1.8 }}>
            1. Clique em um local no mapa para entrar no terminal<br />
            2. Complete a missão usando comandos Linux<br />
            3. Ganhe moedas e desbloqueie novos territórios<br />
            4. Conquiste todas as 10 regiões das Terras do Kernel!
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mb-3 text-xs" style={{ color: "#8b6914" }}>
            💡 <a href={getLoginUrl()} style={{ color: "#c9a227", textDecoration: "underline" }}>Faça login</a> para salvar seu progresso e aparecer no ranking!
          </div>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="w-full py-3 rounded-xl font-bold text-lg transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #8b6914, #c9a227)", color: "#f5e6c8", fontFamily: "'MedievalSharp', serif", border: "none", boxShadow: "0 4px 12px rgba(201,162,39,0.3)" }}
        >
          ⚔ Começar a Aventura!
        </button>
      </div>
    </div>
  );
}
