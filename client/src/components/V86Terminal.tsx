/**
 * V86Terminal — Terminal Linux real rodando Alpine Linux 3.19 via WebAssembly (v86)
 *
 * Usa init=/init-game.sh para boot em 3-8 segundos (sem OpenRC/systemd).
 * Imagem ext2 com Alpine completo: bash, git, curl, grep, awk, sed, find, tar, chmod, etc.
 * Stubs para: apt, dpkg, systemctl, journalctl, rpm, yum, dnf, pacman, snap, etc.
 *
 * Persistência de sessão: salva o estado do disco no IndexedDB a cada 30s.
 * Na próxima abertura, restaura o estado salvo para continuar de onde parou.
 *
 * CDN assets:
 *   - vmlinuz.bin              — kernel Linux Alpine 3.19 x86 (7 MB)
 *   - alpine-disk-v3-final.gz  — disco ext2 com Alpine + stubs + .gitconfig (20 MB)
 *   - v86.wasm                 — emulador x86 compilado em WebAssembly (2 MB)
 *   - libv86.js                — wrapper JS do v86 (329 KB)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

// URLs CDN dos assets do v86
const VMLINUZ_URL  = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/vmlinuz_ddb295c8.bin";
const DISK_URL     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/alpine-disk-v3-final.img_e6f24ca7.gz";
const V86_WASM_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/v86_907393d9.wasm";
const LIBV86_URL   = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/libv86_fb445525.js";

// Parâmetros do kernel para boot rápido com init=/init-game.sh
const KERNEL_CMDLINE = [
  "console=ttyS0",
  "root=/dev/sda",
  "rw",
  "init=/init-game.sh",
  "quiet",
  "loglevel=0",
  "TERM=xterm-256color",
].join(" ");

// Tempo máximo de boot em ms
const BOOT_TIMEOUT_MS = 20000;
// String que indica que o prompt está pronto (aparece no .bashrc)
const PROMPT_READY_MARKER = "aventureiro@terras-do-kernel";

// Chave do IndexedDB para persistência de sessão
const IDB_DB_NAME = "linux-rpg-v86";
const IDB_STORE_NAME = "disk-state";
const IDB_KEY = "session";
// Intervalo de auto-save em ms (30 segundos)
const AUTOSAVE_INTERVAL_MS = 30000;

interface V86TerminalProps {
  /** Chamado sempre que o usuário pressiona Enter com um comando */
  onCommand: (cmd: string, history: string[]) => void;
  /** ID do nível atual — usado como chave de sessão */
  levelId?: string;
  /** Mensagem de boas-vindas exibida no terminal após o boot */
  welcomeLines?: string[];
  /** Altura do terminal. Se undefined, usa 100% do container pai */
  height?: number | string;
}

type LoadingStage =
  | "idle"
  | "loading-script"
  | "loading-kernel"
  | "loading-disk"
  | "restoring"
  | "booting"
  | "ready"
  | "error";

interface LoadProgress {
  stage: LoadingStage;
  percent: number;
  message: string;
}

// ── IndexedDB helpers ──────────────────────────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadDiskState(sessionKey: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const req = tx.objectStore(IDB_STORE_NAME).get(sessionKey);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveDiskState(sessionKey: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const req = tx.objectStore(IDB_STORE_NAME).put(data, sessionKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[V86Terminal] Falha ao salvar sessão:", e);
  }
}

async function clearDiskState(sessionKey: string): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      tx.objectStore(IDB_STORE_NAME).delete(sessionKey);
      tx.oncomplete = () => resolve();
    });
  } catch {
    // ignorar
  }
}

// ── libv86 loader (singleton) ─────────────────────────────────────────────

let libv86LoadPromise: Promise<void> | null = null;
function loadLibV86(): Promise<void> {
  if (libv86LoadPromise) return libv86LoadPromise;
  libv86LoadPromise = new Promise((resolve, reject) => {
    if (typeof (window as unknown as Record<string, unknown>)["V86"] !== "undefined") {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = LIBV86_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar libv86.js do CDN"));
    document.head.appendChild(script);
  });
  return libv86LoadPromise;
}

// Baixa um arquivo binário com progresso
async function fetchWithProgress(
  url: string,
  onProgress: (percent: number) => void
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} ao baixar ${url}`);
  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress(Math.round((received / total) * 100));
  }

  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer.buffer;
}

// ── Componente principal ──────────────────────────────────────────────────

export default function V86Terminal({
  onCommand,
  levelId = "default",
  welcomeLines = [],
  height,
}: V86TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const emulatorRef = useRef<unknown>(null);
  const commandHistoryRef = useRef<string[]>([]);
  const bootReadyRef = useRef(false);
  const outputBufferRef = useRef("");
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionKey = `v86-session-${levelId}`;

  const [progress, setProgress] = useState<LoadProgress>({
    stage: "idle",
    percent: 0,
    message: "Aguardando inicialização...",
  });
  const [hasSavedSession, setHasSavedSession] = useState(false);

  const updateProgress = useCallback(
    (stage: LoadingStage, percent: number, message: string) => {
      setProgress({ stage, percent, message });
    },
    []
  );

  // Salvar estado do disco no IndexedDB
  const saveSession = useCallback(async () => {
    const emulator = emulatorRef.current;
    if (!emulator || !bootReadyRef.current) return;
    try {
      const state = await new Promise<ArrayBuffer>((resolve, reject) => {
        (emulator as Record<string, (cb: (err: unknown, state: ArrayBuffer) => void) => void>)
          ["save_state"]?.((err, state) => {
            if (err) reject(err);
            else resolve(state);
          });
      });
      await saveDiskState(sessionKey, state);
      console.log("[V86Terminal] Sessão salva automaticamente");
    } catch (e) {
      console.warn("[V86Terminal] Falha ao salvar sessão:", e);
    }
  }, [sessionKey]);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    let bootTimeout: ReturnType<typeof setTimeout> | null = null;

    // Inicializar xterm.js
    const xterm = new XTerm({
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        black: "#0d1117",
        brightBlack: "#6e7681",
        red: "#ff7b72",
        brightRed: "#ffa198",
        green: "#3fb950",
        brightGreen: "#56d364",
        yellow: "#d29922",
        brightYellow: "#e3b341",
        blue: "#58a6ff",
        brightBlue: "#79c0ff",
        magenta: "#bc8cff",
        brightMagenta: "#d2a8ff",
        cyan: "#39c5cf",
        brightCyan: "#56d4dd",
        white: "#b1bac4",
        brightWhite: "#f0f6fc",
      },
      fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      allowTransparency: false,
      scrollback: 2000,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(containerRef.current);
    fitAddon.fit();
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch { /* ignorar */ }
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    // Iniciar carregamento do v86
    (async () => {
      try {
        // 1. Verificar sessão salva
        const savedState = await loadDiskState(sessionKey);
        if (savedState) {
          setHasSavedSession(true);
        }

        // 2. Carregar libv86.js
        updateProgress("loading-script", 5, "Carregando emulador WebAssembly...");
        await loadLibV86();
        if (destroyed) return;

        // 3. Baixar kernel Alpine (7 MB)
        updateProgress("loading-kernel", 10, "Baixando kernel Linux (7 MB)...");
        const vmlinuz = await fetchWithProgress(VMLINUZ_URL, (p) => {
          updateProgress("loading-kernel", 10 + Math.round(p * 0.25), `Kernel Linux: ${p}%`);
        });
        if (destroyed) return;

        // 4. Baixar disco Alpine completo (20 MB comprimido)
        updateProgress("loading-disk", 35, "Baixando sistema Alpine Linux (20 MB)...");
        const diskGz = await fetchWithProgress(DISK_URL, (p) => {
          updateProgress(
            "loading-disk",
            35 + Math.round(p * 0.50),
            `Sistema de arquivos: ${p}%`
          );
        });
        if (destroyed) return;

        // 5. Boot
        if (savedState) {
          updateProgress("restoring", 88, "Restaurando sessão anterior...");
        } else {
          updateProgress("booting", 88, "Iniciando Linux... (aguarde ~5 segundos)");
        }

        const V86Constructor = (window as unknown as Record<string, unknown>)["V86"] as new (config: unknown) => unknown;

        const emulatorConfig: Record<string, unknown> = {
          wasm_path: V86_WASM_URL,
          memory_size: 256 * 1024 * 1024, // 256 MB RAM
          vga_memory_size: 2 * 1024 * 1024,
          bzimage: { buffer: vmlinuz },
          hda: {
            buffer: diskGz,
            async: false,
          },
          cmdline: KERNEL_CMDLINE,
          autostart: true,
          disable_keyboard: true,
          serial_container_xtermjs: xterm,
        };

        // Se tiver sessão salva, restaurar o estado
        if (savedState) {
          emulatorConfig["initial_state"] = { buffer: savedState };
        }

        const emulator = new V86Constructor(emulatorConfig);
        emulatorRef.current = emulator;

        // Capturar output do terminal para detectar quando o prompt está pronto
        const originalWrite = xterm.write.bind(xterm);
        (xterm as unknown as Record<string, unknown>).write = (data: string | Uint8Array) => {
          const text = typeof data === "string" ? data : new TextDecoder().decode(data);
          outputBufferRef.current += text;
          // Manter apenas os últimos 500 caracteres no buffer
          if (outputBufferRef.current.length > 500) {
            outputBufferRef.current = outputBufferRef.current.slice(-500);
          }
          // Detectar prompt do aventureiro
          if (!bootReadyRef.current && outputBufferRef.current.includes(PROMPT_READY_MARKER)) {
            bootReadyRef.current = true;
            if (bootTimeout) clearTimeout(bootTimeout);
            updateProgress("ready", 100, "Terminal pronto!");

            // Exibir linhas de boas-vindas extras (se houver)
            if (welcomeLines.length > 0) {
              setTimeout(() => {
                for (const line of welcomeLines) {
                  (emulator as Record<string, (s: string) => void>)["serial0_send"]?.(`echo "${line}"\r`);
                }
              }, 500);
            }

            // Iniciar auto-save a cada 30 segundos
            autosaveTimerRef.current = setInterval(() => {
              saveSession();
            }, AUTOSAVE_INTERVAL_MS);
          }
          return originalWrite(data);
        };

        // Capturar comandos digitados pelo usuário
        let inputBuffer = "";

        xterm.onData((data) => {
          // Enviar para o emulador via serial
          (emulator as Record<string, (s: string) => void>)["serial0_send"]?.(data);

          if (data === "\r" || data === "\n") {
            const cmd = inputBuffer.trim();
            if (cmd && bootReadyRef.current) {
              commandHistoryRef.current = [cmd, ...commandHistoryRef.current.slice(0, 199)];
              onCommand(cmd, [...commandHistoryRef.current]);
            }
            inputBuffer = "";
          } else if (data === "\x7f" || data === "\x08") {
            if (inputBuffer.length > 0) {
              inputBuffer = inputBuffer.slice(0, -1);
            }
          } else if (data.charCodeAt(0) >= 32) {
            inputBuffer += data;
          }
        });

        // Timeout de segurança: se o prompt não aparecer em BOOT_TIMEOUT_MS, liberar mesmo assim
        bootTimeout = setTimeout(() => {
          if (destroyed || bootReadyRef.current) return;
          console.warn("[V86Terminal] Timeout de boot — liberando terminal");
          bootReadyRef.current = true;
          updateProgress("ready", 100, "Terminal pronto!");
          // Iniciar auto-save mesmo após timeout
          autosaveTimerRef.current = setInterval(() => {
            saveSession();
          }, AUTOSAVE_INTERVAL_MS);
        }, BOOT_TIMEOUT_MS);

      } catch (err) {
        if (destroyed) return;
        console.error("[V86Terminal] Erro ao inicializar:", err);
        updateProgress("error", 0, `Erro: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();

    return () => {
      destroyed = true;
      if (bootTimeout) clearTimeout(bootTimeout);
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
      resizeObserver.disconnect();
      if (emulatorRef.current) {
        try {
          (emulatorRef.current as Record<string, () => void>)["destroy"]?.();
        } catch {
          // ignorar erros de cleanup
        }
        emulatorRef.current = null;
      }
      xterm.dispose();
      xtermRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = progress.stage !== "ready" && progress.stage !== "error";

  // Limpar sessão salva
  const handleClearSession = useCallback(async () => {
    await clearDiskState(sessionKey);
    setHasSavedSession(false);
    window.location.reload();
  }, [sessionKey]);

  return (
    <div className="relative flex flex-col w-full" style={{ height: height ?? "100%" }}>
      {/* Overlay de carregamento */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0d1117] rounded-lg border border-[#30363d]">
          {/* Ícone animado */}
          <div className="mb-6 text-5xl animate-pulse">🐧</div>

          <div className="text-[#58a6ff] font-mono text-sm mb-1 font-semibold">
            Alpine Linux 3.19 — Terras do Kernel
          </div>
          <div className="text-[#8b949e] font-mono text-xs mb-6 text-center px-8">
            {progress.message}
          </div>

          {/* Barra de progresso */}
          <div className="w-64 bg-[#21262d] rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#58a6ff] to-[#3fb950] transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="text-[#6e7681] font-mono text-xs">{progress.percent}%</div>

          {/* Etapas de carregamento */}
          <div className="mt-6 flex flex-col gap-1 text-xs font-mono">
            {[
              { stage: "loading-script", label: "Emulador WebAssembly" },
              { stage: "loading-kernel", label: "Kernel Linux (7 MB)" },
              { stage: "loading-disk",   label: "Sistema Alpine (20 MB)" },
              { stage: hasSavedSession ? "restoring" : "booting", label: hasSavedSession ? "Restaurando sessão" : "Boot (init=/init-game.sh)" },
            ].map(({ stage, label }) => {
              const stages: LoadingStage[] = ["loading-script", "loading-kernel", "loading-disk", hasSavedSession ? "restoring" : "booting", "ready"];
              const currentIdx = stages.indexOf(progress.stage);
              const itemIdx = stages.indexOf(stage as LoadingStage);
              const isDone = currentIdx > itemIdx;
              const isCurrent = currentIdx === itemIdx;
              return (
                <div key={stage} className={`flex items-center gap-2 ${isDone ? "text-[#3fb950]" : isCurrent ? "text-[#58a6ff]" : "text-[#6e7681]"}`}>
                  <span>{isDone ? "✓" : isCurrent ? "▶" : "○"}</span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Aviso de sessão salva */}
          {hasSavedSession && (
            <div className="mt-4 text-[#3fb950] font-mono text-xs text-center px-8 max-w-xs">
              💾 Sessão anterior encontrada — restaurando seu progresso!
            </div>
          )}

          {/* Aviso de primeira vez */}
          {progress.stage === "loading-disk" && !hasSavedSession && (
            <div className="mt-4 text-[#6e7681] font-mono text-xs text-center px-8 max-w-xs">
              ⏳ Primeira execução: ~30s para baixar.
              <br />
              Nas próximas vezes o browser fará cache automaticamente.
            </div>
          )}
        </div>
      )}

      {/* Erro */}
      {progress.stage === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0d1117] rounded-lg border border-red-800">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-red-400 font-mono text-sm mb-2">Falha ao inicializar o terminal</div>
          <div className="text-[#8b949e] font-mono text-xs text-center px-8 max-w-xs">
            {progress.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#21262d] text-[#c9d1d9] font-mono text-xs rounded border border-[#30363d] hover:bg-[#30363d] transition-colors"
          >
            Recarregar página
          </button>
        </div>
      )}

      {/* Container do xterm.js */}
      <div
        ref={containerRef}
        className="flex-1 rounded-lg overflow-hidden"
        style={{
          opacity: isLoading || progress.stage === "error" ? 0 : 1,
          transition: "opacity 0.5s ease",
        }}
      />

      {/* Botão de limpar sessão (visível quando pronto) */}
      {progress.stage === "ready" && hasSavedSession && (
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={handleClearSession}
            title="Limpar sessão salva e reiniciar do zero"
            className="px-2 py-1 bg-[#21262d] text-[#6e7681] font-mono text-xs rounded border border-[#30363d] hover:bg-[#30363d] hover:text-[#c9d1d9] transition-colors"
          >
            🔄 Nova sessão
          </button>
        </div>
      )}
    </div>
  );
}
