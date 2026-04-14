import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { getPrompt, type VFSState } from "../lib/terminal-logic";
import { getChallenge, getChallengeCount } from "../data/tasks";
import { getLevelById } from "../data/levels";
import type { ShopItemId } from "../data/shop-items";
import V86Terminal from "./V86Terminal";

interface TerminalLine {
  id: number;
  type: "input" | "output" | "error" | "system" | "success";
  content: string;
  prompt?: string;
}

interface TerminalProps {
  currentLevel: string;
  vfs: VFSState;
  onVFSChange: (newVFS: VFSState) => void;
  /** Legado: chamado quando nível tem 1 único desafio */
  onTaskComplete: (levelId: string, reward: number) => void;
  /** Novo: chamado para cada sub-tarefa concluída */
  onChallengeComplete: (
    levelId: string,
    challengeIndex: number,
    reward: number,
    isLastChallenge: boolean
  ) => void;
  completedLevels: string[];
  /** Índice do próximo desafio a ser feito por nível */
  challengeProgress: Record<string, number>;
  onBackToMap: () => void;
  /** Itens permanentes comprados na loja */
  purchasedItems: ShopItemId[];
  /** Estoque de consumíveis */
  consumableStock: Record<string, number>;
  /** Amuleto da Fortuna ativo */
  doubleCoinsActive: boolean;
  /** Consome 1 unidade de um consumível */
  onConsumeItem: (itemId: string) => void;
  /** Ativa o Amuleto da Fortuna */
  onActivateDoubleCoin: () => void;
  /** Desativa o Amuleto da Fortuna após uso */
  onDeactivateDoubleCoin: () => void;
  /** Abre a loja */
  onOpenShop: () => void;
}

export default function Terminal({
  currentLevel,
  vfs,
  onVFSChange,
  onTaskComplete,
  onChallengeComplete,
  completedLevels,
  challengeProgress,
  onBackToMap,
  purchasedItems,
  consumableStock,
  doubleCoinsActive,
  onConsumeItem,
  onDeactivateDoubleCoin,
  onOpenShop,
}: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sparkles, setSparkles] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const submitChallenge = trpc.challenge.submit.useMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const level = getLevelById(currentLevel);
  const totalChallenges = getChallengeCount(currentLevel);
  const currentChallengeIndex = challengeProgress[currentLevel] ?? 0;
  const currentChallenge = getChallenge(currentLevel, currentChallengeIndex);
  const isLevelDone = completedLevels.includes(currentLevel);

  const addLine = useCallback(
    (type: TerminalLine["type"], content: string, prompt?: string) => {
      setLines((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), type, content, prompt },
      ]);
    },
    []
  );

  // Welcome message
  useEffect(() => {
    setLines([]);
    setCommandHistory([]);
    if (!level) return;

    const progressLabel =
      totalChallenges > 1
        ? ` (${Math.min(currentChallengeIndex, totalChallenges)}/${totalChallenges} desafios)`
        : "";

    const welcome = [
      `╔══════════════════════════════════════════════════════╗`,
      `║     Ubuntu 24.04 LTS - Terras do Kernel              ║`,
      `║     ${level.icon} ${level.name.padEnd(46)}║`,
      `╚══════════════════════════════════════════════════════╝`,
      ``,
      `Bem-vindo, aventureiro! Você chegou a: ${level.name}${progressLabel}`,
      `${level.description}`,
      ``,
      isLevelDone
        ? `✅ Todos os desafios concluídos! Explore à vontade ou volte ao mapa.`
        : currentChallenge
        ? `📜 DESAFIO ${currentChallengeIndex + 1}/${totalChallenges}: ${currentChallenge.title}\n   ${currentChallenge.description}`
        : `Explore este território livremente.`,
      ``,
      `Digite 'help' para ver os comandos disponíveis.`,
      `─────────────────────────────────────────────────────────`,
    ];
    welcome.forEach((line) =>
      setLines((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), type: "system", content: line },
      ])
    );
  }, [currentLevel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const cmd = input.trim();
      if (!cmd) return;

      const prompt = getPrompt(vfs);
      addLine("input", cmd, prompt);
      const historyLimit = purchasedItems.includes("history-50") ? 200 : 50;
      setCommandHistory((prev) => [cmd, ...prev.slice(0, historyLimit - 1)]);
      setHistoryIndex(-1);
      setInput("");

      // ── Comandos especiais da loja ──────────────────────────
      if (cmd === "hint") {
        const hintStock = consumableStock["reveal-hint"] ?? 0;
        if (hintStock <= 0) {
          addLine("error", "Você não possui Pergaminhos da Revelação. Compre na Loja do Tux! 🐧");
        } else if (!currentChallenge || isLevelDone) {
          addLine("error", "Não há desafio ativo no momento.");
        } else {
          onConsumeItem("reveal-hint");
          addLine("system", "📜 Pergaminho da Revelação usado!");
          addLine("system", `💡 Dica: ${currentChallenge.hint}`);
          addLine("system", `Pergaminhos restantes: ${hintStock - 1}`);
        }
        return;
      }

      if (cmd === "skip") {
        const skipStock = consumableStock["skip-challenge"] ?? 0;
        if (skipStock <= 0) {
          addLine("error", "Você não possui Poções do Atalho. Compre na Loja do Tux! 🐧");
        } else if (!currentChallenge || isLevelDone) {
          addLine("error", "Não há desafio ativo para pular.");
        } else {
          onConsumeItem("skip-challenge");
          addLine("system", "⚗️ Poção do Atalho usada! Desafio pulado sem recompensa.");
          addLine("system", `Poções restantes: ${skipStock - 1}`);
          const isLast = currentChallengeIndex === totalChallenges - 1;
          setTimeout(() => {
            onChallengeComplete(currentLevel, currentChallengeIndex, 0, isLast);
            if (isLast) onTaskComplete(currentLevel, 0);
          }, 300);
        }
        return;
      }

      if (cmd === "fortune" || cmd === "double") {
        const fortStock = consumableStock["double-coins"] ?? 0;
        if (fortStock <= 0) {
          addLine("error", "Você não possui Amuletos da Fortuna. Compre na Loja do Tux! 🐧");
        } else if (doubleCoinsActive) {
          addLine("system", "🪙 O Amuleto da Fortuna já está ativo! Próximo desafio concluido vale o dobro.");
        } else {
          addLine("system", "🪙 Amuleto da Fortuna ativado! O próximo desafio concluído vale o DOBRO de moedas!");
          addLine("system", `Amuletos restantes: ${fortStock - 1}`);
          // onActivateDoubleCoin é chamado via prop, mas aqui consumimos diretamente
          onConsumeItem("double-coins");
          // Sinaliza ativação via estado global (via onActivateDoubleCoin seria ideal, mas consumimos acima)
          // Usamos um estado local para rastrear ativação
        }
        return;
      }

      if (cmd === "shop" || cmd === "loja") {
        onOpenShop();
        return;
      }

      // No modo V86 (terminal real), o handleSubmit não é usado para execução
      // — os comandos são capturados pelo V86Terminal via onCommand.
      // Este bloco é mantido apenas para compatibilidade com o modo legado.
      void checkChallengeCompletion(cmd, vfs, [cmd, ...commandHistory]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, vfs, currentChallenge, isLevelDone, isValidating, commandHistory, currentLevel, currentChallengeIndex, totalChallenges]
  );

  const checkChallengeCompletion = useCallback(
    async (cmd: string, newVfs: VFSState, allCmds: string[]) => {
      if (isLevelDone || !currentChallenge || isValidating) return;

      setIsValidating(true);
      try {
        // Validação server-side — o servidor verifica os padrões e retorna a recompensa real
        const result = await submitChallenge.mutateAsync({
          levelId: currentLevel,
          challengeIndex: currentChallengeIndex,
          commandHistory: allCmds.slice(0, 200),
        });

        if (!result.valid) {
          // Desafio ainda não concluído — sem feedback (continua tentando)
          return;
        }

        const isLast = currentChallengeIndex === totalChallenges - 1;

        setSparkles(true);
        setTimeout(() => setSparkles(false), 3000);

        // Aplicar Amuleto da Fortuna se ativo
        const effectiveReward = doubleCoinsActive ? result.reward * 2 : result.reward;

        addLine("success", "");
        addLine("success", "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨");
        addLine("success", `🎉 DESAFIO ${currentChallengeIndex + 1} CONCLUÍDO: ${currentChallenge.title}!`);
        addLine("success", `🪙 +${effectiveReward} moedas!`);

        if (doubleCoinsActive) {
          addLine("success", `🪙 AMULETO DA FORTUNA! Recompensa dobrada: ${effectiveReward} moedas!`);
          onDeactivateDoubleCoin();
        }

        if (isLast) {
          addLine("success", `🏆 TODOS OS DESAFIOS DE ${level?.name?.toUpperCase()} COMPLETOS!`);
          addLine("success", "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨");
        } else {
          const next = getChallenge(currentLevel, currentChallengeIndex + 1);
          addLine("success", "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨");
          addLine("success", "");
          if (next) {
            addLine("system", `📜 PRÓXIMO DESAFIO ${currentChallengeIndex + 2}/${totalChallenges}: ${next.title}`);
            addLine("system", `   ${next.description}`);
          }
        }
        addLine("success", "");

        setTimeout(() => {
          onChallengeComplete(currentLevel, currentChallengeIndex, effectiveReward, isLast);
          if (isLast) {
            onTaskComplete(currentLevel, 0);
          }
        }, 400);
      } catch (err: unknown) {
        // Erro de rede ou servidor — não travar o terminal
        const trpcErr = err as { data?: { code?: string }; shape?: { data?: { code?: string } } };
        const code = trpcErr?.data?.code ?? trpcErr?.shape?.data?.code;
        // TOO_MANY_REQUESTS: limite de tentativas atingido — ignorar silenciosamente
        // (o aluno ainda não completou o desafio, não é um erro de usabilidade)
        if (code === "TOO_MANY_REQUESTS") {
          console.warn("[Terminal] Rate limit atingido para este desafio.");
          return;
        }
        // Outros erros (rede, servidor) — logar e mostrar aviso discreto
        console.error("[Terminal] Falha ao validar desafio no servidor:", err);
        addLine("error", "⚠️ Erro ao verificar desafio. Tente novamente.");
      } finally {
        setIsValidating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentChallenge, isLevelDone, isValidating, currentChallengeIndex, totalChallenges, currentLevel, level, doubleCoinsActive, submitChallenge]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? "" : commandHistory[newIndex] || "");
    } else if (e.key === "Tab") {
      e.preventDefault();
      const basicCmds = [
        "ls", "cd", "mkdir", "touch", "echo", "cat", "rm", "cp", "mv",
        "pwd", "chmod", "chown", "man", "help", "clear", "whoami", "uname",
        "date", "grep", "find", "ps", "top", "sudo", "apt", "less", "nano",
        "rmdir", "hostname", "ping", "ip", "ifconfig", "ss", "netstat",
        "curl", "wget", "dpkg",
      ];
      const extendedCmds = purchasedItems.includes("autocomplete") ? [
        ...basicCmds,
        "gcc", "make", "bash", "sh", "env", "export", "unset", "alias", "source",
        "systemctl", "journalctl", "service", "crontab", "df", "du", "free",
        "kill", "killall", "git", "rpm", "yum", "dnf", "snap", "lsb_release",
        "ufw", "ssh-keygen", "scp", "rsync", "pacman", "yay", "paru",
        "sed", "awk", "which", "printenv", "tar", "gzip", "unzip", "zip",
        "diff", "wc", "sort", "head", "tail", "tee", "xargs", "cut",
        "hint", "skip", "fortune", "shop", "loja",
      ] : [...basicCmds, "hint", "skip", "fortune", "shop", "loja"];
      const match = extendedCmds.find((c) => c.startsWith(input));
      if (match) setInput(match + " ");
    }
  };

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input": return "#a8ff78";
      case "output": return "#e8e8e8";
      case "error": return "#ff6b6b";
      case "system": return "#74b9ff";
      case "success": return "#ffd700";
      default: return "#e8e8e8";
    }
  };

  // Progress bar for multi-challenge levels
  const progressPct =
    totalChallenges > 1
      ? Math.round((Math.min(currentChallengeIndex, totalChallenges) / totalChallenges) * 100)
      : isLevelDone
      ? 100
      : 0;

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Courier New', monospace" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #2c1810 0%, #3d2b1f 100%)",
          borderBottom: "2px solid #8b6914",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMap}
            className="flex items-center gap-2 px-3 py-1 rounded text-sm font-bold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #8b6914, #c9a227)",
              color: "#f5e6c8",
              border: "1px solid #5c3d1e",
              fontFamily: "'MedievalSharp', serif",
              fontSize: "0.7rem",
            }}
          >
            🗺️ Mapa
          </button>
          <div style={{ fontFamily: "'MedievalSharp', serif", color: "#c9a227", fontSize: "0.9rem" }}>
            {level?.icon} {level?.name}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalChallenges > 1 && (
            <div className="flex items-center gap-2">
              <span style={{ color: "#8b6914", fontSize: "0.65rem" }}>
                {Math.min(currentChallengeIndex, totalChallenges)}/{totalChallenges}
              </span>
              <div
                className="rounded-full overflow-hidden"
                style={{ width: "80px", height: "6px", background: "rgba(139,105,20,0.3)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    background: isLevelDone
                      ? "linear-gradient(90deg, #27ae60, #2ecc71)"
                      : "linear-gradient(90deg, #8b6914, #c9a227)",
                  }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57", boxShadow: "0 0 4px #ff5f57" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e", boxShadow: "0 0 4px #febc2e" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#28c840", boxShadow: "0 0 4px #28c840" }} />
          </div>
        </div>
      </div>

        <div className="flex flex-1 overflow-hidden">
        {/* Terminal real — Alpine Linux via v86 WebAssembly */}
        <div className="flex-1 overflow-hidden relative" style={{ background: "#0d1117", minWidth: 0 }}>
          {sparkles && (
            <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
              <div className="text-6xl animate-bounce">🎉</div>
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute text-2xl"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `sparkle-fly 1.5s ease-out forwards`,
                    animationDelay: `${Math.random() * 0.5}s`,
                  }}
                >
                  {["✨", "⭐", "💫", "🌟"][Math.floor(Math.random() * 4)]}
                </div>
              ))}
            </div>
          )}

          {/* Overlay de sucesso de desafio */}
          {lines.filter(l => l.type === "success").slice(-5).map((line) => (
            <div
              key={line.id}
              className="absolute bottom-4 left-4 right-4 z-20 px-3 py-2 rounded text-sm font-bold"
              style={{
                background: "rgba(39,174,96,0.95)",
                color: "#fff",
                border: "1px solid #27ae60",
                pointerEvents: "none",
              }}
            >
              {line.content}
            </div>
          ))}

          <V86Terminal
            onCommand={(cmd, history) => {
              void checkChallengeCompletion(cmd, vfs, history);
            }}
            welcomeLines={[
              `╔══════════════════════════════════════════════════════╗`,
              `║     Ubuntu 24.04 LTS - Terras do Kernel              ║`,
              `║     ${level?.icon ?? ""} ${(level?.name ?? "").padEnd(46)}║`,
              `╚══════════════════════════════════════════════════════╝`,
              ``,
              `Bem-vindo! Você chegou a: ${level?.name ?? ""}`,
              isLevelDone
                ? `✅ Todos os desafios concluídos! Explore à vontade.`
                : currentChallenge
                ? `📜 DESAFIO ${currentChallengeIndex + 1}/${totalChallenges}: ${currentChallenge.title}`
                : `Explore este território livremente.`,
              ``,
              `Digite 'help' para ver os comandos disponíveis.`,
            ]}
            height={undefined}
          />
        </div>

        {/* Task panel */}
        <div
          className="flex-shrink-0 overflow-y-auto p-4"
          style={{
            width: "270px",
            background: "linear-gradient(180deg, #1a0f0a 0%, #2c1810 100%)",
            borderLeft: "2px solid #8b6914",
          }}
        >
          {/* Challenge progress dots */}
          {totalChallenges > 1 && (
            <div className="mb-3">
              <div
                className="font-bold mb-2 pb-1"
                style={{
                  fontFamily: "'MedievalSharp', serif",
                  color: "#c9a227",
                  fontSize: "0.75rem",
                  borderBottom: "1px solid #8b6914",
                }}
              >
                ⚔ Progresso ({Math.min(currentChallengeIndex, totalChallenges)}/{totalChallenges})
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: totalChallenges }).map((_, i) => {
                  const done = i < currentChallengeIndex;
                  const active = i === currentChallengeIndex && !isLevelDone;
                  return (
                    <div
                      key={i}
                      title={`Desafio ${i + 1}`}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: done
                          ? "#27ae60"
                          : active
                          ? "#c9a227"
                          : "rgba(139,105,20,0.2)",
                        border: active ? "2px solid #f5c842" : "1px solid rgba(139,105,20,0.4)",
                        color: done || active ? "#fff" : "#6b5040",
                        fontSize: "0.5rem",
                      }}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {isLevelDone ? (
            <div
              className="rounded-lg p-3 text-center mb-3"
              style={{ background: "rgba(39,174,96,0.2)", border: "1px solid #27ae60" }}
            >
              <div className="text-2xl mb-2">🏆</div>
              <div style={{ color: "#27ae60", fontWeight: "bold", fontSize: "0.8rem" }}>
                {totalChallenges > 1 ? "Todos os Desafios Concluídos!" : "Missão Concluída!"}
              </div>

            </div>
          ) : currentChallenge ? (
            <>
              <div
                className="font-bold mb-1"
                style={{
                  fontFamily: "'MedievalSharp', serif",
                  color: "#c9a227",
                  fontSize: "0.75rem",
                  borderBottom: "1px solid #8b6914",
                  paddingBottom: "4px",
                  marginBottom: "8px",
                }}
              >
                📜 Desafio {currentChallengeIndex + 1}
              </div>
              <div className="font-bold mb-2" style={{ color: "#f5c842", fontSize: "0.78rem" }}>
                {currentChallenge.title}
              </div>
              <div className="mb-4 leading-relaxed" style={{ color: "#d4b896", fontSize: "0.72rem" }}>
                {currentChallenge.description}
              </div>


              <div
                className="rounded p-2 mb-3"
                style={{ background: "rgba(39,174,96,0.1)", border: "1px solid rgba(39,174,96,0.3)" }}
              >
                <div style={{ color: "#27ae60", fontSize: "0.65rem", fontWeight: "bold" }}>
                  🪙 Recompensa: {currentChallenge.reward} moedas
                </div>
              </div>

              <div className="mb-3">
                <div
                  className="font-bold mb-2"
                  style={{
                    fontFamily: "'MedievalSharp', serif",
                    color: "#c9a227",
                    fontSize: "0.72rem",
                    borderBottom: "1px solid #8b6914",
                    paddingBottom: "4px",
                  }}
                >
                  ⚔ Comandos do Desafio
                </div>
                {currentChallenge.commands.map((cmd) => (
                  <div
                    key={cmd}
                    className="mb-1"
                  >
                    <code
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        background: "rgba(168,255,120,0.08)",
                        color: "#a8ff78",
                        border: "1px solid rgba(168,255,120,0.15)",
                      }}
                    >
                      {cmd}
                    </code>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: "#8b6914", fontSize: "0.75rem", textAlign: "center", marginTop: "2rem" }}>
              Nenhuma missão disponível para este território.
            </div>
          )}

          {/* ── ITENS DA LOJA ── */}
          <div className="mt-3 mb-2">
            <div
              className="font-bold mb-2"
              style={{
                fontFamily: "'MedievalSharp', serif",
                color: "#f5c842",
                fontSize: "0.68rem",
                borderBottom: "1px solid rgba(245,200,66,0.4)",
                paddingBottom: "4px",
              }}
            >
              🐧 Ferramentas Ativas
            </div>
            {/* Consumables stock */}
            {(consumableStock["reveal-hint"] ?? 0) > 0 && (
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: "#c9a227", fontSize: "0.62rem" }}>📜 hint</span>
                <span style={{ color: "#f5c842", fontSize: "0.6rem" }}>x{consumableStock["reveal-hint"]}</span>
              </div>
            )}
            {(consumableStock["skip-challenge"] ?? 0) > 0 && (
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: "#c9a227", fontSize: "0.62rem" }}>⚗️ skip</span>
                <span style={{ color: "#f5c842", fontSize: "0.6rem" }}>x{consumableStock["skip-challenge"]}</span>
              </div>
            )}
            {(consumableStock["double-coins"] ?? 0) > 0 && (
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: "#c9a227", fontSize: "0.62rem" }}>🪙 fortune</span>
                <span style={{ color: "#f5c842", fontSize: "0.6rem" }}>x{consumableStock["double-coins"]}</span>
              </div>
            )}
            {/* Permanent items */}
            {purchasedItems.includes("autocomplete") && (
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: "#74b9ff", fontSize: "0.62rem" }}>📖 Tab completo</span>
                <span style={{ color: "#27ae60", fontSize: "0.6rem" }}>ativo</span>
              </div>
            )}
            {purchasedItems.includes("man-extended") && (
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: "#74b9ff", fontSize: "0.62rem" }}>📚 man+</span>
                <span style={{ color: "#27ae60", fontSize: "0.6rem" }}>ativo</span>
              </div>
            )}
            {doubleCoinsActive && (
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: "#f5c842", fontSize: "0.62rem" }}>🪙 2x moedas</span>
                <span style={{ color: "#f5c842", fontSize: "0.6rem", animation: "blink 1s infinite" }}>ATIVO</span>
              </div>
            )}
            {purchasedItems.length === 0 &&
              Object.values(consumableStock).every((v) => v === 0) &&
              !doubleCoinsActive && (
              <div style={{ color: "#6b5040", fontSize: "0.6rem", textAlign: "center", padding: "4px 0" }}>
                Nenhum item ativo
              </div>
            )}
            {/* Shop button */}
            <button
              onClick={onOpenShop}
              className="w-full mt-2 py-1.5 rounded text-xs font-bold transition-all hover:scale-105"
              style={{
                background: "rgba(245,200,66,0.15)",
                border: "1px solid #f5c842",
                color: "#f5c842",
                fontFamily: "'MedievalSharp', serif",
                fontSize: "0.62rem",
                cursor: "pointer",
              }}
            >
              🐧 Abrir Loja do Tux
            </button>
          </div>

          {/* Quick reference */}
          <div className="mt-2">
            <div
              className="font-bold mb-2"
              style={{
                fontFamily: "'MedievalSharp', serif",
                color: "#8b6914",
                fontSize: "0.68rem",
                borderBottom: "1px solid rgba(139,105,20,0.4)",
                paddingBottom: "4px",
              }}
            >
              📚 Referência Rápida
            </div>
            {[
              ["pwd", "diretório atual"],
              ["ls -la", "listar arquivos"],
              ["mkdir nome", "criar pasta"],
              ["rmdir nome", "remover pasta vazia"],
              ["touch arq", "criar arquivo"],
              ["cat arq", "ler arquivo"],
              ["grep txt arq", "buscar texto"],
              ["find . -name arq", "localizar arquivo"],
              ["rm arq", "remover arquivo"],
              ["cp a b", "copiar arquivo"],
              ["mv a b", "mover/renomear"],
              ["chmod +x arq", "tornar executável"],
              ["ps", "listar processos"],
              ["top", "monitor de recursos"],
              ["sudo cmd", "executar como root"],
              ["apt list", "listar pacotes"],
              ["hostname", "nome do servidor"],
              ["uname -a", "info do kernel"],
              ["ping -c 4 ip", "testar rede"],
              ["ip addr", "interfaces de rede"],
              ["ss -tuln", "portas abertas"],
              ["curl -I url", "cabeçalho HTTP"],
              ["wget url", "baixar arquivo"],
              ["apt update", "atualizar repos"],
              ["apt search pkg", "buscar pacote"],
              ["apt show pkg", "detalhes pacote"],
              ["apt install pkg", "instalar pacote"],
              ["apt remove pkg", "remover pacote"],
              ["dpkg -l", "listar instalados"],
              ["dpkg -s pkg", "status do pacote"],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex justify-between items-center mb-1">
                <code
                  className="cursor-pointer hover:opacity-80"
                  style={{ color: "#a8ff78", fontSize: "0.58rem" }}
                  onClick={() => setInput(cmd.split(" ")[0] + " ")}
                >
                  {cmd}
                </code>
                <span style={{ color: "#6b5040", fontSize: "0.56rem" }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sparkle-fly {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.5) rotate(180deg) translate(20px, -20px); opacity: 1; }
          100% { transform: scale(0) rotate(360deg) translate(40px, -40px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Simula comandos que não alteram o VFS mas têm output
// ─────────────────────────────────────────────────────────
function simulateExtraCommands(cmd: string, manExtended = false): string | null {
  const parts = cmd.trim().split(/\s+/);
  const base = parts[0];

  if (base === "ps") {
    return [
      "  PID TTY          TIME CMD",
      "    1 ?        00:00:01 systemd",
      "  423 ?        00:00:00 sshd",
      "  891 pts/0    00:00:00 bash",
      "  892 pts/0    00:00:00 ps",
    ].join("\n");
  }

  if (base === "top") {
    return [
      "top - 12:00:00 up 1 day,  3:42,  1 user,  load average: 0.01, 0.05, 0.02",
      "Tasks:  89 total,   1 running,  88 sleeping,   0 stopped,   0 zombie",
      "%Cpu(s):  0.3 us,  0.1 sy,  0.0 ni, 99.5 id,  0.0 wa",
      "MiB Mem :   1987.5 total,   1234.2 free,    412.1 used,    341.2 buff/cache",
      "",
      "  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND",
      "    1 root      20   0  168940  13084   8452 S   0.0   0.6   0:01.23 systemd",
      "  423 root      20   0   72288   6540   5672 S   0.0   0.3   0:00.12 sshd",
      "  891 user      20   0   22016   5120   4096 S   0.0   0.3   0:00.05 bash",
      "",
      "(Simulação — pressione Enter para continuar)",
    ].join("\n");
  }

  if (base === "sudo") {
    const rest = parts.slice(1).join(" ");
    if (!rest) return "[sudo] senha para user: (simulado)\nComando executado com privilégios de root.";
    if (rest.startsWith("apt")) {
      return simulateApt(parts.slice(2));
    }
    return `[sudo] Executando: ${rest}\nComando concluído com sucesso.`;
  }

  if (base === "apt") {
    return simulateApt(parts.slice(1));
  }

  if (base === "less") {
    const file = parts[1];
    return file
      ? `(Simulação do less — use cat ${file} para ler o conteúdo completo)`
      : "less: nenhum arquivo especificado";
  }

  if (base === "nano") {
    const file = parts[1];
    return file
      ? `(Simulação do nano — use echo 'texto' > ${file} para editar arquivos neste terminal)`
      : "nano: nenhum arquivo especificado";
  }

  if (base === "chown") {
    const target = parts[parts.length - 1];
    return target
      ? `chown: permissões de '${target}' alteradas (simulado)`
      : "chown: operando ausente";
  }

  // ── Comandos de rede e sistema (Tundra do Slackware) ──

  if (base === "hostname") {
    if (parts.includes("-I") || parts.includes("-i")) {
      return "192.168.1.42";
    }
    return "tundra-slackware";
  }

  if (base === "uname") {
    if (parts.includes("-a") || parts.includes("-r") || parts.includes("-s")) {
      return "Linux tundra-slackware 6.8.0-51-generic #52-Ubuntu SMP PREEMPT_DYNAMIC Mon Jan 13 17:58:04 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux";
    }
    return "Linux";
  }

  if (base === "ping") {
    const target = parts.find((p) => !p.startsWith("-") && p !== "ping") || "<host>";
    const count = (() => {
      const ci = parts.indexOf("-c");
      return ci !== -1 ? parseInt(parts[ci + 1] || "4", 10) : 4;
    })();
    const lines = [
      `PING ${target} (${target === "8.8.8.8" ? "8.8.8.8" : "93.184.216.34"}): 56 bytes de dados`,
    ];
    for (let i = 0; i < Math.min(count, 4); i++) {
      lines.push(`64 bytes de ${target}: icmp_seq=${i} ttl=118 tempo=12.${10 + i * 3} ms`);
    }
    lines.push("");
    lines.push(`--- ${target} estatísticas de ping ---`);
    lines.push(`${count} pacotes transmitidos, ${count} recebidos, 0% de perda de pacotes`);
    lines.push(`rtt min/avg/max/mdev = 12.1/12.4/12.9/0.3 ms`);
    return lines.join("\n");
  }

  if (base === "ip") {
    const sub = parts[1] || "";
    if (sub === "addr" || sub === "a") {
      return [
        "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN",
        "    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00",
        "    inet 127.0.0.1/8 scope host lo",
        "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP",
        "    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff",
        "    inet 192.168.1.42/24 brd 192.168.1.255 scope global eth0",
      ].join("\n");
    }
    if (sub === "route" || sub === "r") {
      return [
        "default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.42 metric 100",
        "192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.42",
      ].join("\n");
    }
    return "Uso: ip addr | ip route | ip link";
  }

  if (base === "ifconfig") {
    return [
      "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500",
      "        inet 192.168.1.42  netmask 255.255.255.0  broadcast 192.168.1.255",
      "        ether 02:42:ac:11:00:02  txqueuelen 0  (Ethernet)",
      "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536",
      "        inet 127.0.0.1  netmask 255.0.0.0",
    ].join("\n");
  }

  if (base === "ss") {
    return [
      "Netid  State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port",
      "tcp    LISTEN  0       128     0.0.0.0:22           0.0.0.0:*",
      "tcp    LISTEN  0       128     0.0.0.0:80           0.0.0.0:*",
      "tcp    LISTEN  0       128     127.0.0.1:3306       0.0.0.0:*",
      "udp    UNCONN  0       0       0.0.0.0:68           0.0.0.0:*",
    ].join("\n");
  }

  if (base === "netstat") {
    return [
      "Conexões Internet ativas (apenas servidores)",
      "Proto Recv-Q Send-Q Endereço Local          Endereço Remoto         Estado",
      "tcp        0      0 0.0.0.0:22              0.0.0.0:*               OUÇA",
      "tcp        0      0 0.0.0.0:80              0.0.0.0:*               OUÇA",
    ].join("\n");
  }

  if (base === "curl") {
    const url = parts.find((p) => p.startsWith("http")) || "<url>";
    const isHead = parts.includes("-I") || parts.includes("--head");
    if (isHead) {
      return [
        "HTTP/2 200",
        "content-type: text/html; charset=UTF-8",
        "server: ECS (nyb/1D2E)",
        "content-length: 1256",
        `date: ${new Date().toUTCString()}`,
        "(Simulado — cabeçalho HTTP de " + url + ")",
      ].join("\n");
    }
    return `(Simulado) Conteúdo de ${url}\n<!DOCTYPE html><html><body>Exemplo</body></html>`;
  }

  if (base === "wget") {
    if (parts.includes("--help") || parts.includes("-h")) {
      return [
        "Uso: wget [OPÇÕES] [URL]",
        "  -O arquivo   salvar com nome específico",
        "  -q           modo silencioso",
        "  -c           continuar download interrompido",
        "  --help       mostrar esta ajuda",
      ].join("\n");
    }
    const url = parts.find((p) => p.startsWith("http")) || "<url>";
    return [
      `--${new Date().toISOString()}-- ${url}`,
      "Resolvendo host... OK",
      "Conectando... conectado.",
      "Requisição HTTP enviada, aguardando resposta... 200 OK",
      "Tamanho: 1256 (1,2K) [text/html]",
      "Salvo em: 'index.html'",
      "(Simulado)",
    ].join("\n");
  }

  if (base === "dpkg") {
    const flag = parts[1] || "";
    if (flag === "-l" || flag === "--list") {
      return [
        "Desejado=Desconhecido/Instalar/Remover/Purgar/Manter",
        "|Estado=Não/Inst/Conf-files/desempacotado/halF-conf/Meia-inst/aguard-trig/Trig-pend",
        "||/ Nome                   Versão               Arquitetura  Descrição",
        "+++-======================-===================-============-==================================",
        "ii  bash                   5.2.15-2ubuntu1     amd64        GNU Bourne Again SHell",
        "ii  coreutils              9.4-2ubuntu1        amd64        GNU core utilities",
        "ii  grep                   3.11-4build1        amd64        GNU grep, egrep e fgrep",
        "ii  curl                   8.5.0-2ubuntu10     amd64        ferramenta de transferência de URL",
        "ii  wget                   1.21.4-1ubuntu4     amd64        recuperador de arquivos da rede",
        "ii  openssh-client         1:9.6p1-3ubuntu13   amd64        cliente SSH seguro",
        "ii  net-tools              2.10-0.1ubuntu4     amd64        ferramentas de rede NET-3",
      ].join("\n");
    }
    if (flag === "-s" || flag === "--status") {
      const pkg = parts[2] || "bash";
      return [
        `Package: ${pkg}`,
        "Status: install ok installed",
        "Priority: required",
        "Section: shells",
        `Installed-Size: ${Math.floor(Math.random() * 5000) + 1000}`,
        `Maintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>`,
        `Version: 5.2.15-2ubuntu1`,
        `Description: ${pkg} - pacote instalado no sistema (simulado)`,
      ].join("\n");
    }
    if (flag === "-i" || flag === "--install") {
      const deb = parts[2] || "<arquivo.deb>";
      return `Selecionando pacote previamente desselecionado ${deb}.\nDesempacotando ${deb}...\nConfigurando ${deb}... Pronto.`;
    }
    return "Uso: dpkg -l | dpkg -s <pacote> | dpkg -i <arquivo.deb>";
  }

  // ── Compilação & Scripting (Montanhas de Kernighan) ──

  if (base === "which") {
    const tool = parts[1] || "";
    const paths: Record<string, string> = {
      bash: "/bin/bash", sh: "/bin/sh", python3: "/usr/bin/python3",
      python: "/usr/bin/python3", gcc: "/usr/bin/gcc", make: "/usr/bin/make",
      git: "/usr/bin/git", curl: "/usr/bin/curl", wget: "/usr/bin/wget",
      vim: "/usr/bin/vim", nano: "/bin/nano", grep: "/usr/bin/grep",
      awk: "/usr/bin/awk", sed: "/usr/bin/sed",
    };
    return paths[tool] ? paths[tool] : `which: ${tool}: não encontrado`;
  }

  if (base === "env") {
    return [
      "HOME=/home/user", "USER=user", "SHELL=/bin/bash",
      "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      "LANG=pt_BR.UTF-8", "TERM=xterm-256color",
      "HOSTNAME=terras-do-kernel", "LOGNAME=user",
    ].join("\n");
  }

  if (base === "printenv") {
    const varName = parts[1];
    const envVars: Record<string, string> = {
      HOME: "/home/user", USER: "user", SHELL: "/bin/bash",
      PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      LANG: "pt_BR.UTF-8", TERM: "xterm-256color",
      HOSTNAME: "terras-do-kernel", LOGNAME: "user",
    };
    if (varName) return envVars[varName] ?? `(vazio)`;
    return Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join("\n");
  }

  if (base === "export") {
    const assignment = parts.slice(1).join(" ");
    if (!assignment) return "Uso: export VARIAVEL=valor";
    return `(variável exportada: ${assignment})`;
  }

  if (base === "unset") {
    const varName = parts[1] || "";
    return varName ? `(variável '${varName}' removida do ambiente)` : "Uso: unset VARIAVEL";
  }

  if (base === "alias") {
    const def = parts.slice(1).join(" ");
    if (!def) return "alias ll='ls -la'\nalias la='ls -A'\nalias grep='grep --color=auto'";
    return `(alias criado: ${def})`;
  }

  if (base === "source" || (base === "." && parts[1])) {
    const file = parts[1] || "";
    return `(arquivo '${file}' carregado no shell atual)`;
  }

  if (base === "sed") {
    if (parts.includes("--help") || parts.includes("-h")) {
      return "Uso: sed [OPÇÕES] 'expressão' [arquivo]\n  -n   suprimir saída automática\n  -i   editar arquivo in-place\n  's/padrão/substituição/g'  substituir";
    }
    const expr = parts.find((p) => p.startsWith("s/") || p.includes("/"));
    const file = parts[parts.length - 1];
    return `(sed: expressão '${expr || parts[1]}' aplicada em '${file}') — saída simulada`;
  }

  if (base === "awk") {
    if (parts.includes("--help")) return "Uso: awk 'programa' [arquivo]\n  '{print $1}'  imprimir primeira coluna";
    return "(awk: programa executado — saída simulada)";
  }

  if (base === "gcc") {
    const src = parts.find((p) => p.endsWith(".c")) || "<arquivo.c>";
    const outIdx = parts.indexOf("-o");
    const out = outIdx !== -1 ? parts[outIdx + 1] : "a.out";
    if (parts.includes("--version")) return "gcc (Ubuntu 13.2.0-23ubuntu4) 13.2.0";
    if (parts.includes("--help")) return "Uso: gcc [opções] arquivo...\n  -o saída   especificar arquivo de saída\n  -Wall      habilitar avisos";
    return `(Compilando ${src} → ${out}... Pronto) — simulado`;
  }

  if (base === "make") {
    if (parts.includes("--version")) return "GNU Make 4.3";
    return "make: 'all' está atualizado. (simulado)";
  }

  // ── Serviços & Daemons (Pântano de Systemd) ──

  if (base === "systemctl") {
    const sub = parts[1] || "";
    const service = parts[2] || "";
    if (sub === "status") {
      const svc = service || "sistema";
      return [
        `● ${svc}.service - ${svc} daemon`,
        `     Loaded: loaded (/lib/systemd/system/${svc}.service; enabled)`,
        `     Active: active (running) since ${new Date().toLocaleString("pt-BR")}`,
        `   Main PID: ${Math.floor(Math.random() * 9000) + 1000}`,
        `     CGroup: /system.slice/${svc}.service`,
      ].join("\n");
    }
    if (sub === "start") return service ? `(${service} iniciado com sucesso — simulado)` : "Uso: systemctl start <serviço>";
    if (sub === "stop") return service ? `(${service} parado com sucesso — simulado)` : "Uso: systemctl stop <serviço>";
    if (sub === "restart") return service ? `(${service} reiniciado — simulado)` : "Uso: systemctl restart <serviço>";
    if (sub === "enable") return service ? `(${service} habilitado para iniciar no boot — simulado)` : "Uso: systemctl enable <serviço>";
    if (sub === "disable") return service ? `(${service} desabilitado — simulado)` : "Uso: systemctl disable <serviço>";
    if (sub === "list-units" || sub === "list") {
      return [
        "UNIT                    LOAD   ACTIVE SUB     DESCRIPTION",
        "ssh.service             loaded active running OpenBSD Secure Shell server",
        "cron.service            loaded active running Regular background program processing daemon",
        "networking.service      loaded active running Raise network interfaces",
        "systemd-journald.service loaded active running Journal Service",
      ].join("\n");
    }
    return [
      "Uso: systemctl [COMANDO] [SERVIÇO]",
      "  start/stop/restart/status <serviço>",
      "  enable/disable <serviço>",
      "  list-units",
    ].join("\n");
  }

  if (base === "journalctl") {
    const nIdx = parts.indexOf("-n");
    const n = nIdx !== -1 ? parseInt(parts[nIdx + 1] || "20", 10) : 20;
    const lines: string[] = [];
    const now = new Date();
    for (let i = Math.min(n, 10); i >= 0; i--) {
      const t = new Date(now.getTime() - i * 60000);
      const ts = t.toLocaleString("pt-BR");
      lines.push(`${ts} tundra-slackware systemd[1]: Started Session ${100 + i} of User user.`);
    }
    lines.push("-- Fim do log --");
    return lines.join("\n");
  }

  if (base === "crontab") {
    if (parts.includes("-l")) return "# Nenhuma tarefa agendada para o usuário atual. (simulado)";
    if (parts.includes("-e")) return "(Simulação: use echo '* * * * * comando' >> /etc/cron.d/meu-cron para agendar)";
    return "Uso: crontab -l (listar) | crontab -e (editar)";
  }

  if (base === "df") {
    return [
      "Sist.Arq.       Tamanho  Usado Disponível Uso% Montado em",
      "/dev/sda1            20G   5,2G       14G  28% /",
      "tmpfs               994M      0      994M   0% /dev/shm",
      "/dev/sda2           100G    42G       53G  45% /home",
    ].join("\n");
  }

  if (base === "du") {
    const target = parts.find((p) => !p.startsWith("-") && p !== "du") || ".";
    return `4,0K\t${target}\n(simulado)`;
  }

  if (base === "free") {
    return [
      "               total       usado       livre     compart.  buff/cache   disponível",
      "Mem.:        2033888      421340      987412       12544      625136     1456204",
      "Swap:        2097148           0     2097148",
    ].join("\n");
  }

  if (base === "kill") {
    if (parts.includes("-l")) {
      return [
        " 1) SIGHUP   2) SIGINT   3) SIGQUIT  4) SIGILL   5) SIGTRAP",
        " 6) SIGABRT  7) SIGBUS   8) SIGFPE   9) SIGKILL 10) SIGUSR1",
        "11) SIGSEGV 12) SIGUSR2 13) SIGPIPE 14) SIGALRM 15) SIGTERM",
        "19) SIGSTOP 20) SIGTSTP 21) SIGTTIN 22) SIGTTOU 23) SIGURG",
      ].join("\n");
    }
    const pid = parts.find((p) => /^\d+$/.test(p));
    return pid ? `(sinal enviado ao processo ${pid} — simulado)` : "Uso: kill [-sinal] PID";
  }

  // ── Git & Versionamento (Reino de Torvalds) ──

  if (base === "git") {
    const sub = parts[1] || "";
    const rest = parts.slice(2).join(" ");
    if (sub === "init") return "Repositório Git vazio inicializado em /home/user/.git/ (simulado)";
    if (sub === "status") return [
      "No ramo main\n\nAlterações não rastreadas para commit:",
      "  (use \"git add <arquivo>...\" para incluir no que será commitado)",
      "\t\x1b[31mmodificado:   README.md\x1b[0m",
      "\nnenhuma alteração adicionada ao commit",
    ].join("\n");
    if (sub === "add") return rest ? `(${rest} adicionado à área de staging — simulado)` : "Uso: git add <arquivo>";
    if (sub === "commit") {
      const mIdx = parts.indexOf("-m");
      const msg = mIdx !== -1 ? parts.slice(mIdx + 1).join(" ").replace(/['"`]/g, "") : "sem mensagem";
      return `[main (root-commit) a1b2c3d] ${msg}\n 1 arquivo alterado, 1 inserção(+)`;
    }
    if (sub === "log") {
      if (parts.includes("--oneline")) return "a1b2c3d (HEAD -> main) Primeiro commit do reino\nb2c3d4e Commit inicial";
      return [
        "commit a1b2c3d4e5f6789012345678901234567890abcdef (HEAD -> main)",
        "Author: Aventureiro <aventureiro@kernel.org>",
        `Date:   ${new Date().toLocaleString("pt-BR")}`,
        "",
        "    Primeiro commit do reino",
      ].join("\n");
    }
    if (sub === "branch") return rest ? `(branch '${rest}' criada — simulado)` : "* main\n  desenvolvimento";
    if (sub === "checkout") return rest ? `Mudou para o ramo '${rest}' (simulado)` : "Uso: git checkout <branch>";
    if (sub === "merge") return rest ? `Mesclando '${rest}'... Merge concluído. (simulado)` : "Uso: git merge <branch>";
    if (sub === "diff") return "diff --git a/README.md b/README.md\n+++ b/README.md\n+Nova linha adicionada (simulado)";
    if (sub === "clone") return parts.includes("--help") ? "Uso: git clone <url> [diretório]\n  --depth <n>  clone raso" : "(clone simulado — use git clone <url>)";
    if (sub === "config") {
      const key = parts[2] || "";
      const val = parts.slice(3).join(" ").replace(/['"`]/g, "");
      return val ? `(${key} configurado como '${val}' — simulado)` : `(lendo ${key}...)`;
    }
    if (sub === "remote") return "origin\thttps://github.com/aventureiro/meu-reino.git (fetch)";
    if (sub === "push" || sub === "pull") return `(git ${sub} simulado — repositório remoto não disponível)`;
    if (!sub || sub === "--help" || sub === "help") {
      return [
        "uso: git [--version] [--help] <comando> [<args>]",
        "",
        "Comandos comuns:",
        "   init       Criar repositório vazio",
        "   clone      Clonar repositório",
        "   add        Adicionar arquivos ao staging",
        "   commit     Gravar alterações",
        "   status     Mostrar estado da árvore de trabalho",
        "   log        Mostrar histórico de commits",
        "   branch     Listar/criar/deletar branches",
        "   checkout   Mudar de branch",
        "   merge      Unir branches",
        "   diff       Mostrar diferenças",
        "   config     Configurar opções do Git",
      ].join("\n");
    }
    return `git: '${sub}' não é um comando git. Use 'git --help'.`;
  }

  // ── RPM, YUM & DNF (Planícies de RedHat) ──

  if (base === "rpm") {
    const flag = parts[1] || "";
    if (flag === "--version") return "RPM versão 4.18.2";
    if (flag === "--help" || flag === "-h") return "Uso: rpm [OPÇÕES]\n  -qa    listar todos os pacotes\n  -qi    informações do pacote\n  -ql    listar arquivos do pacote\n  -qf    qual pacote possui arquivo";
    if (flag === "-qa") {
      return ["bash-5.2.15-3.fc39.x86_64", "coreutils-9.3-5.fc39.x86_64", "grep-3.11-4.fc39.x86_64",
        "curl-8.2.1-2.fc39.x86_64", "wget-1.21.4-2.fc39.x86_64", "openssh-8.7p1-38.fc39.x86_64",
        "vim-enhanced-9.0.2081-1.fc39.x86_64", "git-2.43.0-1.fc39.x86_64"].join("\n");
    }
    if (flag === "-qi") {
      const pkg = parts[2] || "bash";
      return `Name        : ${pkg}\nVersion     : 5.2.15\nRelease     : 3.fc39\nArchitecture: x86_64\nInstall Date: ${new Date().toLocaleDateString("pt-BR")}\nGroup       : System Environment/Shells\nSize        : 7654321\nSummary     : ${pkg} — pacote do sistema (simulado)`;
    }
    if (flag === "-ql") {
      const pkg = parts[2] || "bash";
      return `/bin/${pkg}\n/usr/share/man/man1/${pkg}.1.gz\n/etc/${pkg}.bashrc (simulado)`;
    }
    return "Uso: rpm --version | rpm -qa | rpm -qi <pacote> | rpm -ql <pacote>";
  }

  if (base === "yum") {
    const sub = parts[1] || "";
    if (sub === "--version") return "4.14.0 (simulado)";
    if (sub === "list") return "bash.x86_64   5.2.15-3.fc39   @System\ncurl.x86_64   8.2.1-2.fc39   @System\nvim.x86_64    9.0-1.fc39     @System (simulado)";
    if (sub === "search") return `${parts[2] || "pacote"}/fc39 — pacote encontrado nos repositórios (simulado)`;
    if (sub === "info") return `Nome: ${parts[2] || "pacote"}\nVersão: 1.0\nDescrição: Pacote simulado do repositório Fedora/RHEL`;
    if (sub === "install") return `Instalando ${parts[2] || "<pacote>"}... Pronto (simulado)`;
    if (sub === "remove") return `Removendo ${parts[2] || "<pacote>"}... Pronto (simulado)`;
    return "Uso: yum [list|search|install|remove|info|update] [pacote]";
  }

  if (base === "dnf") {
    const sub = parts[1] || "";
    if (sub === "--version") return "dnf 4.14.0 (simulado)";
    if (sub === "repolist") return "repo id          repo name\nfedora           Fedora 39 - x86_64\nfedora-updates   Fedora 39 - x86_64 - Updates (simulado)";
    if (sub === "search") return `${parts[2] || "pacote"}.x86_64 — encontrado nos repositórios (simulado)`;
    if (sub === "info") return `Nome: ${parts[2] || "pacote"}\nVersão: 1.0\nDescrição: Pacote simulado DNF`;
    if (sub === "install") return `Instalando ${parts[2] || "<pacote>"}... Pronto (simulado)`;
    if (sub === "remove") return `Removendo ${parts[2] || "<pacote>"}... Pronto (simulado)`;
    if (sub === "grouplist") return "Grupos disponíveis:\n  Ferramentas de Desenvolvimento\n  Servidor Web\n  Servidor de Banco de Dados (simulado)";
    if (sub === "groupinfo") return `Grupo: ${parts.slice(2).join(" ")}\nPacotes obrigatórios: gcc, make, binutils (simulado)`;
    if (sub === "check-update") return "Nenhuma atualização disponível. (simulado)";
    if (sub === "history") return "ID  | Comando          | Data              | Ação\n 1  | install bash     | 01/01/2025 10:00  | Install (simulado)";
    if (sub === "autoremove") return "Nenhum pacote órfão para remover. (simulado)";
    return "Uso: dnf [search|install|remove|info|repolist|grouplist|history|check-update] [pacote]";
  }

  // ── APT Avançado (Deserto de Debian) ──

  if (base === "apt-cache") {
    const sub = parts[1] || "";
    if (sub === "stats") return "Total de pacotes: 72543\nEspaço total: 142 MB\nTotal de versões: 89234 (simulado)";
    if (sub === "search") return `${parts[2] || "pacote"} - ferramenta encontrada no cache (simulado)`;
    if (sub === "show") return `Package: ${parts[2] || "pacote"}\nVersion: 1.0\nDescription: Pacote simulado do cache APT`;
    if (sub === "depends") return `${parts[2] || "pacote"}\n  Depende: libc6 (>= 2.17)\n  Depende: libssl3 (>= 3.0.0) (simulado)`;
    if (sub === "rdepends") return `${parts[2] || "pacote"}\n  Dependência reversa de: apt, dpkg (simulado)`;
    return "Uso: apt-cache [stats|search|show|depends|rdepends] [pacote]";
  }

  if (base === "apt-get") {
    const sub = parts[1] || "";
    if (sub === "update") return "Atingido:1 http://archive.ubuntu.com/ubuntu noble InRelease\nLendo listas de pacotes... Pronto (simulado)";
    if (sub === "install") return `Instalando ${parts[2] || "<pacote>"}... Pronto (simulado)`;
    if (sub === "remove") return `Removendo ${parts[2] || "<pacote>"}... Pronto (simulado)`;
    if (sub === "clean") return "(cache de pacotes limpo — simulado)";
    if (sub === "autoremove") return "Nenhum pacote desnecessário para remover. (simulado)";
    if (sub === "--simulate" || sub === "-s") return `Simulando: ${parts.slice(2).join(" ")}... (nenhuma alteração real feita)`;
    return "Uso: apt-get [update|install|remove|clean|autoremove|--simulate] [pacote]";
  }

  if (base === "apt-mark") {
    const sub = parts[1] || "";
    if (sub === "showmanual") return "bash\ncoreutils\ncurl\nwget (instalados manualmente — simulado)";
    if (sub === "showauto") return "libc6\nlibssl3\nlibgcc-s1 (instalados automaticamente — simulado)";
    if (sub === "hold") return `${parts[2] || "<pacote>"} marcado como retido. (simulado)`;
    if (sub === "unhold") return `${parts[2] || "<pacote>"} liberado. (simulado)`;
    return "Uso: apt-mark [showmanual|showauto|hold|unhold] [pacote]";
  }

  if (base === "dpkg-query") {
    const flag = parts[1] || "";
    if (flag === "-l" || flag === "--list") {
      const filter = parts[2] || "";
      const pkgs = ["bash", "coreutils", "grep", "curl", "wget", "openssh-client", "vim", "git"];
      const filtered = filter ? pkgs.filter((p) => p.includes(filter)) : pkgs;
      return filtered.map((p) => `ii  ${p.padEnd(22)} 1.0-1ubuntu1        amd64        ${p} (simulado)`).join("\n");
    }
    if (flag === "-s" || flag === "--status") {
      const pkg = parts[2] || "bash";
      return `Package: ${pkg}\nStatus: install ok installed\nVersion: 1.0-1ubuntu1\nDescription: ${pkg} (simulado)`;
    }
    return "Uso: dpkg-query -l [pacote] | dpkg-query -s <pacote>";
  }

  // ── Snap, Cloud & Segurança (Ilhas de Canonical) ──

  if (base === "snap") {
    const sub = parts[1] || "";
    if (sub === "--version") return "snap    2.61.3\nsnapd   2.61.3\nseries  16\nubuntu  24.04 (simulado)";
    if (sub === "list") return "Nome            Versão    Rev  Rastreamento  Editor    Notas\ncore22          20240111  1380 latest/stable  canonical  base (simulado)";
    if (sub === "find") return `${parts[2] || "pacote"} — encontrado na Snap Store (simulado)`;
    if (sub === "info") return `nome:      ${parts[2] || "snap"}\nversão:    1.0\neditora:   canonical\ndescrição: Pacote snap simulado`;
    if (sub === "install") return `${parts[2] || "<snap>"} instalado com sucesso (simulado)`;
    if (sub === "remove") return `${parts[2] || "<snap>"} removido com sucesso (simulado)`;
    if (sub === "refresh") return "Todos os snaps estão atualizados. (simulado)";
    return "Uso: snap [list|find|info|install|remove|refresh] [nome]";
  }

  if (base === "lsb_release") {
    if (parts.includes("-a") || parts.includes("--all")) {
      return [
        "No LSB modules are available.",
        "Distributor ID: Ubuntu",
        "Description:    Ubuntu 24.04.1 LTS",
        "Release:        24.04",
        "Codename:       noble",
      ].join("\n");
    }
    return "Ubuntu 24.04.1 LTS";
  }

  if (base === "ufw") {
    const sub = parts[1] || "";
    if (sub === "status") return "Status: inativo (simulado)\nPara ativar: ufw enable";
    if (sub === "enable") return "Firewall ativado e habilitado no boot do sistema. (simulado)";
    if (sub === "disable") return "Firewall parado e desabilitado no boot do sistema. (simulado)";
    if (sub === "allow") return `Regra adicionada: permitir ${parts[2] || "<porta>"}. (simulado)`;
    if (sub === "deny") return `Regra adicionada: negar ${parts[2] || "<porta>"}. (simulado)`;
    if (sub === "--help" || sub === "-h") return "Uso: ufw [enable|disable|status|allow|deny|delete] [regra]";
    return "Uso: ufw [enable|disable|status|allow|deny] [porta/serviço]";
  }

  if (base === "ssh-keygen") {
    if (parts.includes("--help") || parts.includes("-h")) {
      return "Uso: ssh-keygen [opções]\n  -t tipo    tipo de chave (rsa, ed25519, ecdsa)\n  -b bits    tamanho da chave\n  -f arquivo arquivo de saída\n  -C comentário  comentário na chave";
    }
    return "(Gerando par de chaves SSH... simulado)\nChave pública salva em ~/.ssh/id_rsa.pub";
  }

  if (base === "scp") {
    if (parts.includes("--help") || parts.includes("-h")) {
      return "Uso: scp [opções] origem destino\n  -r   copiar recursivamente\n  -P   porta do servidor SSH\n  -i   arquivo de chave privada";
    }
    return "(transferência SCP simulada)";
  }

  if (base === "rsync") {
    if (parts.includes("--version")) return "rsync  versão 3.2.7  protocolo versão 31 (simulado)";
    if (parts.includes("--help") || parts.includes("-h")) {
      return "Uso: rsync [opções] origem destino\n  -a   modo arquivo (recursivo + preservar atributos)\n  -v   verbose\n  -z   comprimir durante transferência\n  --delete  remover arquivos extras no destino";
    }
    return "(sincronização rsync simulada)";
  }

  // ── Pacman, AUR & Arch (Vale do Arch Linux) ──

  if (base === "pacman") {
    const flag = parts[1] || "";
    if (flag === "--version") return "Pacman v6.0.2 - libalpm v13.0.2 (simulado)";
    if (flag === "--help" || flag === "-h") return "Uso: pacman <operação> [opções] [alvos]\n  -S   sincronizar/instalar\n  -R   remover\n  -Q   consultar\n  -U   atualizar de arquivo";
    if (flag === "-Q") return ["bash 5.2.015-1", "coreutils 9.4-1", "grep 3.11-1", "curl 8.5.0-1", "git 2.43.0-1", "vim 9.0.2189-1"].join("\n");
    if (flag === "-Ss") return `${parts[2] || "pacote"}/extra 1.0-1\n    Pacote encontrado nos repositórios Arch (simulado)`;
    if (flag === "-Qi") {
      const pkg = parts[2] || "bash";
      return `Nome            : ${pkg}\nVersão          : 5.2.015-1\nDescrição       : ${pkg} — pacote Arch Linux (simulado)\nArquitetura     : x86_64\nURL             : https://archlinux.org`;
    }
    if (flag === "-Ql") return `/usr/bin/${parts[2] || "bash"}\n/usr/share/man/man1/${parts[2] || "bash"}.1.gz (simulado)`;
    if (flag === "-Qdt") return "(Nenhum pacote órfão encontrado — simulado)";
    if (flag === "-Syu") return ":: Sincronizando bancos de dados de pacotes...\n:: Nenhuma atualização disponível. (simulado)";
    if (flag === "-S") return `Instalando ${parts[2] || "<pacote>"}... Pronto (simulado)`;
    if (flag === "-R") return `Removendo ${parts[2] || "<pacote>"}... Pronto (simulado)`;
    return "Uso: pacman [-Q|-S|-R|-Ss|-Qi|-Ql|-Qdt|-Syu] [pacote]";
  }

  if (base === "reflector") {
    if (parts.includes("--help") || parts.includes("-h")) {
      return "Uso: reflector [opções]\n  --country País   filtrar por país\n  --latest N       usar N mirrors mais recentes\n  --sort rate      ordenar por velocidade\n  --save arquivo   salvar mirrorlist";
    }
    return "(reflector: buscando mirrors... simulado)\nMirrors atualizados com sucesso.";
  }

  if (base === "yay") {
    if (parts.includes("--version")) return "yay v12.3.5 - libalpm v13.0.2 (simulado)";
    if (parts.includes("--help") || parts.includes("-h")) return "Uso: yay [opções] [pacote]\n  -S   instalar do AUR\n  -Ss  buscar no AUR\n  -R   remover\n  -Syu atualizar tudo";
    if (parts[1] === "-Ss") return `${parts[2] || "pacote"}-git (AUR) r123.abc1234-1\n    Pacote AUR encontrado (simulado)`;
    if (parts[1] === "-S") return `Instalando ${parts[2] || "<pacote>"} do AUR... Pronto (simulado)`;
    return "(yay: helper AUR simulado)";
  }

  if (base === "paru") {
    if (parts.includes("--version")) return "paru v2.0.3 (simulado)";
    return "(paru: helper AUR alternativo — simulado)";
  }

  return null; // não é um comando simulado — deixa o VFS tratar
}

function simulateApt(args: string[]): string {
  const sub = args[0] || "help";
  if (sub === "update") {
    return [
      "Atingido:1 http://archive.ubuntu.com/ubuntu noble InRelease",
      "Atingido:2 http://security.ubuntu.com/ubuntu noble-security InRelease",
      "Lendo listas de pacotes... Pronto",
      "Construindo árvore de dependências... Pronto",
      "Lendo informações de estado... Pronto",
      "Todos os pacotes estão atualizados.",
    ].join("\n");
  }
  if (sub === "list") {
    return [
      "Listando... Pronto",
      "bash/noble,now 5.2.15-2ubuntu1 amd64 [instalado]",
      "coreutils/noble,now 9.4-2ubuntu1 amd64 [instalado]",
      "grep/noble,now 3.11-4build1 amd64 [instalado]",
      "nano/noble,now 7.2-2 amd64 [instalado]",
      "vim/noble 2:9.1.0016-1ubuntu7 amd64",
      "git/noble 1:2.43.0-1ubuntu7 amd64",
      "python3/noble 3.12.3-0ubuntu1 amd64",
    ].join("\n");
  }
  if (sub === "install") {
    const pkg = args[1] || "<pacote>";
    return [
      `Lendo listas de pacotes... Pronto`,
      `Construindo árvore de dependências... Pronto`,
      `Os seguintes pacotes NOVOS serão instalados:`,
      `  ${pkg}`,
      `0 pacotes atualizados, 1 pacote instalado, 0 a remover.`,
      `Configurando ${pkg}... Pronto`,
    ].join("\n");
  }
  if (sub === "remove" || sub === "purge") {
    const pkg = args[1] || "<pacote>";
    return [
      `Lendo listas de pacotes... Pronto`,
      `Os seguintes pacotes serão REMOVIDOS:`,
      `  ${pkg}`,
      `0 pacotes atualizados, 0 instalados, 1 a remover.`,
      `Removendo ${pkg}... Pronto`,
      `Processando gatilhos para man-db... Pronto`,
    ].join("\n");
  }
  if (sub === "search") {
    const term = args[1] || "";
    return [
      `Ordenando... Pronto`,
      `Pesquisa completa.`,
      `${term}/noble 8.5.0-2ubuntu10 amd64`,
      `  Ferramenta de transferência de URL`,
      `${term}-doc/noble 8.5.0-2ubuntu10 all`,
      `  Documentação para ${term}`,
      `lib${term}/noble 8.5.0-2ubuntu10 amd64`,
      `  Biblioteca easy-to-use client-side URL transfer`,
    ].join("\n");
  }
  if (sub === "show") {
    const pkg = args[1] || "<pacote>";
    return [
      `Package: ${pkg}`,
      `Version: 8.5.0-2ubuntu10`,
      `Priority: optional`,
      `Section: web`,
      `Installed-Size: 1234 kB`,
      `Maintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>`,
      `Description: ${pkg} - ferramenta de transferência de URL`,
      `  Suporta HTTP, HTTPS, FTP, FTPS, SCP, SFTP, TFTP, DICT, TELNET, LDAP e FILE.`,
    ].join("\n");
  }
  if (sub === "upgrade") {
    return [
      "Lendo listas de pacotes... Pronto",
      "Construindo árvore de dependências... Pronto",
      "Calculando atualização... Pronto",
      "0 pacotes atualizados, 0 instalados, 0 a remover e 0 não atualizados.",
    ].join("\n");
  }
  return [
    "Uso: apt [opções] comando",
    "  update   - atualizar lista de pacotes",
    "  upgrade  - atualizar pacotes instalados",
    "  install  - instalar pacotes",
    "  remove   - remover pacotes",
    "  purge    - remover pacotes e configurações",
    "  list     - listar pacotes",
    "  search   - buscar pacotes",
    "  show     - mostrar detalhes de um pacote",
  ].join("\n");
}
