import { useState, useRef, useEffect, useCallback } from "react";
import { executeCommand, getPrompt, type VFSState } from "../lib/terminal-logic";
import { getTaskByLevel } from "../data/tasks";
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
  onTaskComplete: (levelId: string, reward: number) => void;
  completedLevels: string[];
  onBackToMap: () => void;
}

export default function Terminal({
  currentLevel,
  vfs,
  onVFSChange,
  onTaskComplete,
  completedLevels,
  onBackToMap,
}: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lineId, setLineId] = useState(0);
  const [taskJustCompleted, setTaskJustCompleted] = useState(false);
  const [sparkles, setSparkles] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const level = getLevelById(currentLevel);
  const task = getTaskByLevel(currentLevel);
  const isTaskDone = completedLevels.includes(currentLevel);

  const nextId = useCallback(() => {
    setLineId((prev) => prev + 1);
    return lineId + 1;
  }, [lineId]);

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
    const welcome = [
      `╔══════════════════════════════════════════════════════╗`,
      `║     Ubuntu 24.04 LTS - Terras do Kernel              ║`,
      `║     ${level.icon} ${level.name.padEnd(46)}║`,
      `╚══════════════════════════════════════════════════════╝`,
      ``,
      `Bem-vindo, aventureiro! Você chegou a: ${level.name}`,
      `${level.description}`,
      ``,
      isTaskDone
        ? `✅ Missão já concluída! Explore à vontade ou volte ao mapa.`
        : task
        ? `📜 MISSÃO: ${task.title}\n   ${task.description}`
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

      // Check task completion
      if (task && !isTaskDone && !taskJustCompleted) {
        const allCmds = [cmd, ...commandHistory];
        const taskDone = task.validate(result.newState, allCmds);
        if (taskDone) {
          setTaskJustCompleted(true);
          setSparkles(true);
          setTimeout(() => setSparkles(false), 3000);
          addLine("success", "");
          addLine("success", "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨");
          addLine("success", `🎉 MISSÃO CONCLUÍDA: ${task.title}!`);
          addLine("success", `🪙 Você ganhou ${task.reward} moedas!`);
          addLine("success", "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨");
          addLine("success", "");
          setTimeout(() => {
            onTaskComplete(currentLevel, task.reward);
          }, 500);
        }
      }
    },
    [input, vfs, task, isTaskDone, taskJustCompleted, commandHistory, currentLevel, addLine, onVFSChange, onTaskComplete]
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
      // Simple tab completion
      const cmds = ["ls", "cd", "mkdir", "touch", "echo", "cat", "rm", "cp", "mv", "pwd", "chmod", "man", "help", "clear", "whoami", "uname", "date"];
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
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#ff5f57", boxShadow: "0 0 4px #ff5f57" }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#febc2e", boxShadow: "0 0 4px #febc2e" }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#28c840", boxShadow: "0 0 4px #28c840" }}
          />
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
            width: "260px",
            background: "linear-gradient(180deg, #1a0f0a 0%, #2c1810 100%)",
            borderLeft: "2px solid #8b6914",
          }}
        >
          {task ? (
            <>
              <div
                className="font-bold mb-3 pb-2"
                style={{
                  fontFamily: "'MedievalSharp', serif",
                  color: "#c9a227",
                  fontSize: "0.8rem",
                  borderBottom: "1px solid #8b6914",
                }}
              >
                📜 Missão Atual
              </div>

              {isTaskDone ? (
                <div
                  className="rounded-lg p-3 text-center"
                  style={{ background: "rgba(39,174,96,0.2)", border: "1px solid #27ae60" }}
                >
                  <div className="text-2xl mb-2">✅</div>
                  <div style={{ color: "#27ae60", fontWeight: "bold", fontSize: "0.8rem" }}>
                    Missão Concluída!
                  </div>
                  <div style={{ color: "#a8d8a8", fontSize: "0.7rem", marginTop: "4px" }}>
                    +{task.reward} moedas ganhas
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="font-bold mb-2"
                    style={{ color: "#f5c842", fontSize: "0.8rem" }}
                  >
                    {task.title}
                  </div>
                  <div
                    className="mb-4 leading-relaxed"
                    style={{ color: "#d4b896", fontSize: "0.72rem" }}
                  >
                    {task.description}
                  </div>

                  <div
                    className="rounded p-2 mb-3"
                    style={{ background: "rgba(139,105,20,0.2)", border: "1px solid #8b6914" }}
                  >
                    <div style={{ color: "#c9a227", fontSize: "0.65rem", fontWeight: "bold", marginBottom: "4px" }}>
                      💡 Dica:
                    </div>
                    <code style={{ color: "#a8ff78", fontSize: "0.7rem" }}>{task.hint}</code>
                  </div>

                  <div
                    className="rounded p-2"
                    style={{ background: "rgba(39,174,96,0.1)", border: "1px solid rgba(39,174,96,0.3)" }}
                  >
                    <div style={{ color: "#27ae60", fontSize: "0.65rem", fontWeight: "bold" }}>
                      🪙 Recompensa: {task.reward} moedas
                    </div>
                  </div>
                </>
              )}

              <div className="mt-4">
                <div
                  className="font-bold mb-2"
                  style={{
                    fontFamily: "'MedievalSharp', serif",
                    color: "#c9a227",
                    fontSize: "0.75rem",
                    borderBottom: "1px solid #8b6914",
                    paddingBottom: "4px",
                  }}
                >
                  ⚔ Comandos Úteis
                </div>
                {task.commands.map((cmd) => (
                  <div
                    key={cmd}
                    className="mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setInput(cmd + " ")}
                    title="Clique para inserir"
                  >
                    <code
                      className="px-2 py-0.5 rounded text-xs"
                      style={{ background: "rgba(168,255,120,0.1)", color: "#a8ff78", border: "1px solid rgba(168,255,120,0.2)" }}
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

          {/* Quick commands reference */}
          <div className="mt-4">
            <div
              className="font-bold mb-2"
              style={{
                fontFamily: "'MedievalSharp', serif",
                color: "#8b6914",
                fontSize: "0.7rem",
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
              ["touch arq", "criar arquivo"],
              ["cat arq", "ler arquivo"],
              ["rm arq", "remover arquivo"],
              ["cd pasta", "entrar na pasta"],
              ["echo txt > arq", "escrever arquivo"],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex justify-between items-center mb-1">
                <code
                  className="cursor-pointer hover:opacity-80"
                  style={{ color: "#a8ff78", fontSize: "0.6rem" }}
                  onClick={() => setInput(cmd.split(" ")[0] + " ")}
                >
                  {cmd}
                </code>
                <span style={{ color: "#6b5040", fontSize: "0.58rem" }}>{desc}</span>
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
