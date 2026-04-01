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
        "rmdir", "hostname", "ping", "ip", "ifconfig", "ss", "netstat",
        "curl", "wget", "dpkg",
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
