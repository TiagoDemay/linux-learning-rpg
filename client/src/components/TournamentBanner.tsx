import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Banner que aparece para alunos quando um novo torneio é criado ou renomeado.
 * Detecta mudanças no torneio ativo comparando com o último estado visto (localStorage).
 */
export function TournamentBanner() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const prevKey = useRef<string | null>(null);

  const { data } = trpc.professor.getTournamentEvent.useQuery(undefined, {
    refetchInterval: 15_000, // verifica a cada 15s
  });

  useEffect(() => {
    if (!data) return;

    // Chave única: combinação de tournamentId + name + startedAt
    const key = `${data.tournamentId ?? "none"}-${data.name}-${data.startedAt?.getTime?.() ?? 0}`;
    const storedKey = localStorage.getItem("tournament_banner_key");

    // Primeira carga: apenas armazenar, não exibir
    if (prevKey.current === null) {
      prevKey.current = key;
      if (!storedKey) {
        localStorage.setItem("tournament_banner_key", key);
      }
      return;
    }

    // Mudança detectada: exibir banner
    if (key !== storedKey) {
      localStorage.setItem("tournament_banner_key", key);
      prevKey.current = key;
      setMessage(`⚔️ Novo torneio iniciado: "${data.name}"`);
      setVisible(true);
    }
  }, [data]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-6 py-3 animate-slide-down"
      style={{
        background: "linear-gradient(90deg, #78350f 0%, #92400e 40%, #78350f 100%)",
        borderBottom: "2px solid #d97706",
        boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏆</span>
        <div>
          <p className="text-amber-100 font-semibold text-sm">{message}</p>
          <p className="text-amber-400/70 text-xs">Seu progresso foi zerado. Boa sorte neste torneio!</p>
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-amber-400 hover:text-amber-200 text-lg font-bold px-2 transition-colors"
        aria-label="Fechar notificação"
      >
        ✕
      </button>

      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
