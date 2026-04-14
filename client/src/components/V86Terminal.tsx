/**
 * V86Terminal — Terminal Linux real rodando Alpine Linux 3.19 via WebAssembly (v86)
 *
 * Usa uma imagem de disco ext2 com Alpine Linux completo (bash, git, curl, grep, etc.)
 * e auto-login do usuário "aventureiro". O v86 emula um CPU x86 em WASM no browser.
 *
 * CDN assets:
 *   - vmlinuz.bin        — kernel Linux Alpine 3.19 x86 (7 MB)
 *   - alpine-disk.img.gz — disco ext2 com Alpine completo (20 MB comprimido)
 *   - v86.wasm           — emulador x86 compilado em WebAssembly (2 MB)
 *   - libv86.js          — wrapper JS do v86 (329 KB)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

// URLs CDN dos assets do v86 (geradas pelo manus-upload-file --webdev)
const VMLINUZ_URL  = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/vmlinuz_ddb295c8.bin";
const DISK_URL     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/alpine-disk.img_e18d6a58.gz";
const V86_WASM_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/v86_907393d9.wasm";
const LIBV86_URL   = "https://d2xsxph8kpxj0f.cloudfront.net/310519663063764281/TSiRdqLfDbHcFkVjrjk85H/libv86_fb445525.js";

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
    script.onerror = () => reject(new Error("Falha ao carregar libv86.js"));
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
        updateProgress("loading-kernel", 10, "Baixando kernel Linux Alpine (7 MB)...");
        const vmlinuz = await fetchWithProgress(VMLINUZ_URL, (p) => {
          updateProgress("loading-kernel", 10 + Math.round(p * 0.25), `Kernel: ${p}%`);
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

        // 4. Boot
        updateProgress("booting", 92, "Iniciando Alpine Linux...");

        const V86Constructor = (window as unknown as Record<string, unknown>)["V86"] as new (config: unknown) => unknown;

        const emulator = new V86Constructor({
          wasm_path: V86_WASM_URL,
          memory_size: 256 * 1024 * 1024, // 256 MB RAM
          vga_memory_size: 2 * 1024 * 1024,
          // Kernel Alpine
          bzimage: { buffer: vmlinuz },
          // Disco ext2 com Alpine completo (comprimido com gzip)
          hda: {
            buffer: diskGz,
            async: false,
          },
          // Linha de comando do kernel: boot do disco, auto-login
          cmdline: [
            "console=ttyS0",
            "root=/dev/sda",
            "rw",
            "init=/sbin/init",
            "quiet",
            "loglevel=0",
            "TERM=xterm-256color",
          ].join(" "),
          autostart: true,
          disable_keyboard: true,
          serial_container_xtermjs: xterm,
        });

        emulatorRef.current = emulator;

        // Capturar comandos digitados pelo usuário
        let inputBuffer = "";
        let bootReady = false;

        xterm.onData((data) => {
          // Enviar para o emulador via serial
          (emulator as Record<string, (s: string) => void>)["serial0_send"]?.(data);

          if (data === "\r" || data === "\n") {
            const cmd = inputBuffer.trim();
            if (cmd && bootReady) {
              commandHistoryRef.current = [cmd, ...commandHistoryRef.current.slice(0, 199)];
              onCommand(cmd, [...commandHistoryRef.current]);
            }
            inputBuffer = "";
          } else if (data === "\x7f" || data === "\x08") {
            // Backspace
            if (inputBuffer.length > 0) {
              inputBuffer = inputBuffer.slice(0, -1);
            }
          } else if (data.charCodeAt(0) >= 32) {
            // Caractere imprimível
            inputBuffer += data;
          }
        });

        // Detectar quando o boot está completo (prompt do aventureiro aparece)
        // O Alpine leva ~20-30s para bootar no v86 com disco ext2
        const bootCheckInterval = setInterval(() => {
          if (destroyed) {
            clearInterval(bootCheckInterval);
            return;
          }
          // Verificar se o terminal tem output (boot progredindo)
        }, 1000);

        // Timeout de boot: após 30s, considerar pronto
        const bootTimeout = setTimeout(() => {
          if (destroyed) return;
          clearInterval(bootCheckInterval);
          bootReady = true;
          updateProgress("ready", 100, "Alpine Linux pronto!");

          // Exibir mensagens de boas-vindas do jogo após o prompt aparecer
          if (welcomeLines.length > 0) {
            setTimeout(() => {
              if (destroyed) return;
              // Limpar a tela e exibir boas-vindas
              (emulator as Record<string, (s: string) => void>)["serial0_send"]?.("clear\r");
              setTimeout(() => {
                if (destroyed) return;
                welcomeLines.forEach((line) => {
                  (emulator as Record<string, (s: string) => void>)["serial0_send"]?.(
                    `echo '${line.replace(/'/g, "'\\''")}'` + "\r"
                  );
                });
              }, 500);
            }, 2000);
          }
        }, 30000);

        return () => {
          clearTimeout(bootTimeout);
          clearInterval(bootCheckInterval);
        };
      } catch (err) {
        if (destroyed) return;
        console.error("[V86Terminal] Erro ao inicializar:", err);
        updateProgress("error", 0, `Erro: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();

    return () => {
      destroyed = true;
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
      {/* Barra de progresso de carregamento */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0d1117] rounded-lg border border-[#30363d]">
          {/* Logo animado */}
          <div className="mb-6 text-5xl animate-pulse">🐧</div>
          <div className="text-[#58a6ff] font-mono text-sm mb-2 font-semibold">
            Alpine Linux 3.19 — Terras do Kernel
          </div>
          <div className="text-[#8b949e] font-mono text-xs mb-6 text-center px-8">
            {progress.message}
          </div>

          {/* Barra de progresso */}
          <div className="w-64 bg-[#21262d] rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#58a6ff] to-[#3fb950] transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="text-[#6e7681] font-mono text-xs">{progress.percent}%</div>

          {/* Aviso de primeira vez */}
          {progress.percent < 80 && (
            <div className="mt-6 text-[#6e7681] font-mono text-xs text-center px-8 max-w-xs">
              ⏳ Primeira execução: ~30s para baixar o sistema Linux.
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
          <div className="text-[#8b949e] font-mono text-xs text-center px-8">
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
