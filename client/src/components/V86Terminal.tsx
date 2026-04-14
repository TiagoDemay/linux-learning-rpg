/**
 * V86Terminal — Terminal Linux real rodando Alpine Linux 3.19 via WebAssembly (v86)
 *
 * Usa init=/bin/bash para boot em 3-8 segundos (sem OpenRC/systemd).
 * Imagem ext2 com Alpine completo: bash, git, curl, grep, awk, sed, find, tar, chmod, etc.
 *
 * CDN assets:
 *   - vmlinuz.bin          — kernel Linux Alpine 3.19 x86 (7 MB)
 *   - alpine-disk-v2.img.gz — disco ext2 com Alpine + init=/bin/bash (20 MB comprimido)
 *   - v86.wasm             — emulador x86 compilado em WebAssembly (2 MB)
 *   - libv86.js            — wrapper JS do v86 (329 KB)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

// URLs CDN dos assets do v86
const VMLINUZ_URL  = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/vmlinuz_ddb295c8.bin";
const DISK_URL     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/alpine-disk-v2.img_adaa3c25.gz";
const V86_WASM_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/v86_907393d9.wasm";
const LIBV86_URL   = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/libv86_fb445525.js";

// Parâmetros do kernel para boot rápido com init=/bin/bash
// - init=/init-game.sh: executa nosso script de inicialização diretamente
// - console=ttyS0: redireciona console para porta serial (xterm.js)
// - quiet loglevel=0: suprime mensagens de boot do kernel
const KERNEL_CMDLINE = [
  "console=ttyS0",
  "root=/dev/sda",
  "rw",
  "init=/init-game.sh",
  "quiet",
  "loglevel=0",
  "TERM=xterm-256color",
].join(" ");

// Tempo máximo de boot em ms (init=/bin/bash deve bootar em 3-8s, damos 15s de margem)
const BOOT_TIMEOUT_MS = 15000;
// String que indica que o prompt está pronto (aparece no .bashrc)
const PROMPT_READY_MARKER = "aventureiro@terras-do-kernel";

interface V86TerminalProps {
  /** Chamado sempre que o usuário pressiona Enter com um comando */
  onCommand: (cmd: string, history: string[]) => void;
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
  | "booting"
  | "ready"
  | "error";

interface LoadProgress {
  stage: LoadingStage;
  percent: number;
  message: string;
}

// Carrega o script libv86.js do CDN uma única vez (singleton)
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

export default function V86Terminal({
  onCommand,
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

  const [progress, setProgress] = useState<LoadProgress>({
    stage: "idle",
    percent: 0,
    message: "Aguardando inicialização...",
  });

  const updateProgress = useCallback(
    (stage: LoadingStage, percent: number, message: string) => {
      setProgress({ stage, percent, message });
    },
    []
  );

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
        // 1. Carregar libv86.js
        updateProgress("loading-script", 5, "Carregando emulador WebAssembly...");
        await loadLibV86();
        if (destroyed) return;

        // 2. Baixar kernel Alpine (7 MB)
        updateProgress("loading-kernel", 10, "Baixando kernel Linux (7 MB)...");
        const vmlinuz = await fetchWithProgress(VMLINUZ_URL, (p) => {
          updateProgress("loading-kernel", 10 + Math.round(p * 0.25), `Kernel Linux: ${p}%`);
        });
        if (destroyed) return;

        // 3. Baixar disco Alpine completo (20 MB comprimido)
        updateProgress("loading-disk", 35, "Baixando sistema Alpine Linux (20 MB)...");
        const diskGz = await fetchWithProgress(DISK_URL, (p) => {
          updateProgress(
            "loading-disk",
            35 + Math.round(p * 0.55),
            `Sistema de arquivos: ${p}%`
          );
        });
        if (destroyed) return;

        // 4. Boot com init=/bin/bash (rápido: 3-8 segundos)
        updateProgress("booting", 92, "Iniciando Linux... (aguarde ~5 segundos)");

        const V86Constructor = (window as unknown as Record<string, unknown>)["V86"] as new (config: unknown) => unknown;

        const emulator = new V86Constructor({
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
        });

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
  }, []); // Montar apenas uma vez

  const isLoading = progress.stage !== "ready" && progress.stage !== "error";

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
              { stage: "booting",        label: "Boot (init=/bin/bash)" },
            ].map(({ stage, label }) => {
              const stages: LoadingStage[] = ["loading-script", "loading-kernel", "loading-disk", "booting", "ready"];
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

          {/* Aviso de primeira vez */}
          {progress.stage === "loading-disk" && (
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
    </div>
  );
}
