import { useState, useRef, useEffect, useCallback } from "react";
import { executeCommand, getPrompt, type VFSState } from "../lib/terminal-logic";
import { getLevelTaskGroup, getChallenge, getChallengeCount } from "../data/tasks";
import { getLevelById } from "../data/levels";

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
  /** Reinicia o VFS e o progresso do nível atual */
  onResetChallenge: (levelId: string) => void;
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
  onResetChallenge,
}: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sparkles, setSparkles] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const level = getLevelById(currentLevel);
  const taskGroup = getLevelTaskGroup(currentLevel);
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
      setCommandHistory((prev) => [cmd, ...prev.slice(0, 49)]);
      setHistoryIndex(-1);
      setInput("");

      // Simulate ps / top / sudo / apt / less / nano locally
      const simulated = simulateExtraCommands(cmd);
      if (simulated !== null) {
        simulated.split("\n").forEach((line) => addLine("output", line));
        // ps/top/sudo/apt don't change VFS — just check task completion
        checkChallengeCompletion(cmd, vfs, [cmd, ...commandHistory]);
        return;
      }

      const result = executeCommand(cmd, vfs);

      if (result.output === "\x1b[CLEAR]") {
        setLines([]);
        onVFSChange(result.newState);
        return;
      }

      if (result.output) {
        result.output.split("\n").forEach((line) => addLine("output", line));
      }
      if (result.error) {
        result.error.split("\n").forEach((line) => addLine("error", line));
      }

      onVFSChange(result.newState);
      checkChallengeCompletion(cmd, result.newState, [cmd, ...commandHistory]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, vfs, currentChallenge, isLevelDone, commandHistory, currentLevel, currentChallengeIndex, totalChallenges]
  );

  const checkChallengeCompletion = useCallback(
    (cmd: string, newVfs: VFSState, allCmds: string[]) => {
      if (isLevelDone || !currentChallenge) return;

      const done = currentChallenge.validate(newVfs, allCmds);
      if (!done) return;

      const isLast = currentChallengeIndex === totalChallenges - 1;

      setSparkles(true);
      setTimeout(() => setSparkles(false), 3000);

      addLine("success", "");
      addLine("success", "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨");
      addLine("success", `🎉 DESAFIO ${currentChallengeIndex + 1} CONCLUÍDO: ${currentChallenge.title}!`);
      addLine("success", `🪙 +${currentChallenge.reward} moedas!`);

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
          addLine("system", `   💡 Dica: ${next.hint}`);
        }
      }
      addLine("success", "");

      setTimeout(() => {
        onChallengeComplete(currentLevel, currentChallengeIndex, currentChallenge.reward, isLast);
        if (isLast) {
          onTaskComplete(currentLevel, 0); // notifica legado com reward 0 (já somado acima)
        }
      }, 400);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentChallenge, isLevelDone, currentChallengeIndex, totalChallenges, currentLevel, level]
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
      const cmds = [
        "ls", "cd", "mkdir", "touch", "echo", "cat", "rm", "cp", "mv",
        "pwd", "chmod", "chown", "man", "help", "clear", "whoami", "uname",
        "date", "grep", "find", "ps", "top", "sudo", "apt", "less", "nano",
        "rmdir",
      ];
      const match = cmds.find((c) => c.startsWith(input));
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
        {/* Terminal output */}
        <div
          className="flex-1 overflow-y-auto p-4 cursor-text"
          style={{ background: "#0d1117", minWidth: 0 }}
          onClick={() => inputRef.current?.focus()}
        >
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

          {lines.map((line) => (
            <div key={line.id} className="flex items-start gap-1 leading-5 text-sm">
              {line.type === "input" && line.prompt && (
                <span style={{ color: "#a8ff78", flexShrink: 0 }}>{line.prompt} </span>
              )}
              <span
                style={{
                  color: getLineColor(line.type),
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  fontWeight: line.type === "success" ? "bold" : "normal",
                }}
              >
                {line.content}
              </span>
            </div>
          ))}

          {/* Input line */}
          <form onSubmit={handleSubmit} className="flex items-center gap-1 mt-1">
            <span style={{ color: "#a8ff78", flexShrink: 0, fontSize: "0.875rem" }}>
              {getPrompt(vfs)}{" "}
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{
                color: "#a8ff78",
                caretColor: "#a8ff78",
                fontFamily: "'Courier New', monospace",
              }}
            />
          </form>
          <div ref={bottomRef} />
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

          {/* Botão Reiniciar Desafio */}
          {!isLevelDone && (
            <button
              onClick={() => {
                if (window.confirm(`Reiniciar todos os desafios de "${level?.name}"? O progresso e o VFS serão resetados.`)) {
                  onResetChallenge(currentLevel);
                  setLines([]);
                  setCommandHistory([]);
                }
              }}
              className="w-full mb-3 py-1.5 rounded text-xs font-bold transition-all hover:scale-105 hover:opacity-90"
              style={{
                background: "rgba(180,40,40,0.18)",
                border: "1px solid #8b2020",
                color: "#ff8080",
                fontFamily: "'MedievalSharp', serif",
                fontSize: "0.65rem",
                cursor: "pointer",
              }}
            >
              🔄 Reiniciar Desafio
            </button>
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
              <button
                onClick={() => {
                  if (window.confirm(`Reiniciar todos os desafios de "${level?.name}"?`)) {
                    onResetChallenge(currentLevel);
                    setLines([]);
                    setCommandHistory([]);
                  }
                }}
                className="mt-2 w-full py-1 rounded text-xs font-bold transition-all hover:opacity-80"
                style={{
                  background: "rgba(180,40,40,0.18)",
                  border: "1px solid #8b2020",
                  color: "#ff8080",
                  cursor: "pointer",
                  fontSize: "0.6rem",
                }}
              >
                🔄 Refazer Desafios
              </button>
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
                style={{ background: "rgba(139,105,20,0.2)", border: "1px solid #8b6914" }}
              >
                <div style={{ color: "#c9a227", fontSize: "0.65rem", fontWeight: "bold", marginBottom: "4px" }}>
                  💡 Dica:
                </div>
                <code style={{ color: "#a8ff78", fontSize: "0.68rem", whiteSpace: "pre-wrap" }}>
                  {currentChallenge.hint}
                </code>
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
                    className="mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setInput(cmd + " ")}
                    title="Clique para inserir"
                  >
                    <code
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        background: "rgba(168,255,120,0.1)",
                        color: "#a8ff78",
                        border: "1px solid rgba(168,255,120,0.2)",
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
function simulateExtraCommands(cmd: string): string | null {
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
  return [
    "Uso: apt [opções] comando",
    "  update   - atualizar lista de pacotes",
    "  install  - instalar pacotes",
    "  remove   - remover pacotes",
    "  list     - listar pacotes",
    "  search   - buscar pacotes",
  ].join("\n");
}
