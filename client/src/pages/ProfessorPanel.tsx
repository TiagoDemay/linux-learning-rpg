import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useMemo, Fragment } from "react";
import { useLocation } from "wouter";
import { LEVELS } from "@/data/levels";

// Map levelId → display name
const LEVEL_NAMES: Record<string, string> = Object.fromEntries(
  LEVELS.map((l) => [l.id, `${l.emoji} ${l.name}`])
);

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportTournamentCsv(tournament: {
  tournamentName: string;
  resetAt: Date | null | undefined;
  players: Array<{
    position: number;
    name: string | null;
    email: string | null;
    coins: number;
    completedLevels: string[];
    currentLevel: string;
  }>;
}) {
  const header = ["Posição", "Nome", "E-mail", "Moedas", "Territórios Concluídos", "Nível Final"];
  const rows = tournament.players.map((p) => [
    p.position,
    p.name ?? "Anônimo",
    p.email ?? "",
    p.coins,
    p.completedLevels.length,
    p.currentLevel,
  ]);

  const csvContent = [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const bom = "\uFEFF"; // UTF-8 BOM para compatibilidade com Excel
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = tournament.tournamentName.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, "").trim();
  const dateStr = tournament.resetAt
    ? new Date(tournament.resetAt).toLocaleDateString("pt-BR").replace(/\//g, "-")
    : "sem-data";
  link.href = url;
  link.download = `ranking-${safeName}-${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function timeAgo(d: Date | null | undefined) {
  if (!d) return "nunca";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const colors = [
    "#2d5a27", "#1a5276", "#6b4226", "#7d3c98",
    "#117a65", "#b7950b", "#922b21", "#1f618d",
  ];
  const color = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div
      style={{ backgroundColor: color }}
      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
    >
      {initials || "?"}
    </div>
  );
}

function ChallengeBar({ progress, total = 10 }: { progress: number; total?: number }) {
  const pct = Math.min(100, Math.round((progress / total) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-amber-900/30 rounded-full h-2 min-w-[60px]">
        <div
          className="h-2 rounded-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-amber-300 w-10 text-right">{progress}/{total}</span>
    </div>
  );
}

type SortKey = "position" | "name" | "coins" | "completedCount" | "lastSignedIn";

export default function ProfessorPanel() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { data: students, isLoading, error, refetch } = trpc.professor.getStudents.useQuery(
    undefined,
    {
      enabled: !!user && user.role === "admin",
      refetchInterval: 30000, // auto-refresh every 30s
    }
  );

  const { data: tournaments, refetch: refetchHistory } = trpc.professor.getTournamentHistory.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const [activeTab, setActiveTab] = useState<"students" | "history" | "tournament" | "security">("students");
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const { data: securityEvents, refetch: refetchSecurityEvents, isLoading: loadingSecurityEvents } =
    trpc.professor.getSecurityEvents.useQuery(
      { limit: 200 },
      { enabled: !!user && user.role === "admin" }
    );

  // Torneio ativo
  const { data: activeTournamentData, refetch: refetchActiveTournament } = trpc.professor.getActiveTournament.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );
  const { data: participants, refetch: refetchParticipants } = trpc.professor.getParticipants.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );
  const createTournamentMutation = trpc.professor.createTournament.useMutation({
    onSuccess: () => { refetchActiveTournament(); refetchParticipants(); refetch(); }
  });
  const renameTournamentMutation = trpc.professor.renameTournament.useMutation({
    onSuccess: () => { refetchActiveTournament(); }
  });
  const toggleParticipantMutation = trpc.professor.toggleParticipant.useMutation({
    onSuccess: () => { refetchParticipants(); refetch(); }
  });
  const setAllParticipantsMutation = trpc.professor.setAllParticipants.useMutation({
    onSuccess: () => { refetchParticipants(); refetch(); }
  });
  const deleteTournamentMutation = trpc.professor.deleteTournamentHistory.useMutation({
    onSuccess: () => { refetchHistory(); }
  });
  const deleteUserMutation = trpc.professor.deleteUser.useMutation({
    onSuccess: () => { refetch(); refetchParticipants(); }
  });
  const setUserBlockedMutation = trpc.professor.setUserBlocked.useMutation({
    onSuccess: () => { refetch(); }
  });

  const [newTournamentName, setNewTournamentName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const filtered = useMemo(() => {
    if (!students) return [];
    let list = [...students];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.email ?? "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va: string | number | Date = a[sortKey] as string | number | Date;
      let vb: string | number | Date = b[sortKey] as string | number | Date;
      if (sortKey === "lastSignedIn") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      if (typeof va === "string" && typeof vb === "string")
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return list;
  }, [students, search, sortKey, sortAsc]);

  // Total de desafios por nível (10 por padrão)
  const totalChallengesPerLevel = 10;

  function getTotalChallengesCompleted(s: typeof filtered[0]) {
    return Object.values(s.challengeProgress).reduce((acc, v) => acc + v, 0);
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <span className="ml-1 text-amber-400">{sortAsc ? "↑" : "↓"}</span>
    ) : (
      <span className="ml-1 text-amber-700">↕</span>
    );

  // ── Auth guards ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0f00]">
        <div className="text-amber-400 font-medieval text-xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#1a0f00]">
        <div className="text-amber-400 font-medieval text-2xl">🔐 Acesso Restrito</div>
        <p className="text-amber-200/70 text-sm">Faça login para acessar o painel do professor.</p>
        <a
          href={getLoginUrl()}
          className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold transition-colors"
        >
          Entrar
        </a>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#1a0f00]">
        <div className="text-red-400 font-medieval text-2xl">⛔ Acesso Negado</div>
        <p className="text-amber-200/70 text-sm">Esta área é exclusiva para o professor.</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
        >
          ← Voltar ao Mapa
        </button>
      </div>
    );
  }

  // ── Main panel ───────────────────────────────────────────────────────────────
  const totalStudents = students?.length ?? 0;
  const activeToday = students?.filter((s) => {
    if (!s.lastSignedIn) return false;
    const diff = Date.now() - new Date(s.lastSignedIn).getTime();
    return diff < 86400000;
  }).length ?? 0;
  const totalCoins = students?.reduce((acc, s) => acc + s.coins, 0) ?? 0;
  const completedAll = students?.filter((s) => s.completedCount >= 10).length ?? 0;

  return (
    <div className="h-screen bg-[#1a0f00] text-amber-100 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="bg-[#2c1a00] border-b border-amber-900/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-amber-400 hover:text-amber-200 transition-colors text-sm flex items-center gap-1"
          >
            ← Mapa
          </button>
          <span className="text-amber-700">|</span>
          <h1 className="font-medieval text-2xl text-amber-400 tracking-wide">
            📜 Painel do Professor
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-amber-300/60 text-xs">
            Atualiza automaticamente a cada 30s
          </span>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-amber-800/50 hover:bg-amber-700/50 border border-amber-700/50 rounded-lg text-amber-300 text-sm transition-colors"
          >
            🔄 Atualizar
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px] mx-auto w-full">
        {/* ── Abas ── */}
        <div className="flex gap-2 border-b border-amber-900/40 pb-0 flex-wrap">
          <button
            onClick={() => setActiveTab("tournament")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === "tournament"
                ? "bg-[#2c1a00] border border-b-0 border-amber-700/60 text-amber-300"
                : "text-amber-600 hover:text-amber-400"
            }`}
          >
            ⚔️ Torneio Ativo
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === "students"
                ? "bg-[#2c1a00] border border-b-0 border-amber-700/60 text-amber-300"
                : "text-amber-600 hover:text-amber-400"
            }`}
          >
            👥 Alunos {students ? `(${students.length})` : ""}
          </button>
          <button
            onClick={() => { setActiveTab("history"); refetchHistory(); }}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === "history"
                ? "bg-[#2c1a00] border border-b-0 border-amber-700/60 text-amber-300"
                : "text-amber-600 hover:text-amber-400"
            }`}
          >
            🏆 Histórico {tournaments && tournaments.length > 0 ? `(${tournaments.length})` : ""}
          </button>
          <button
            onClick={() => { setActiveTab("security"); refetchSecurityEvents(); }}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === "security"
                ? "bg-[#2c1a00] border border-b-0 border-amber-700/60 text-amber-300"
                : "text-amber-600 hover:text-amber-400"
            }`}
          >
            🛡️ Segurança {securityEvents && securityEvents.length > 0 ? `(${securityEvents.length})` : ""}
          </button>
        </div>

        {activeTab === "tournament" && (
          <div className="space-y-6">
            {/* ── Torneio Ativo: cabeçalho ── */}
            <div className="bg-[#2c1a00] border border-amber-700/50 rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <h2 className="font-medieval text-xl text-amber-300 mb-1">
                    {activeTournamentData?.name ?? "Sem torneio ativo"}
                  </h2>
                  <p className="text-amber-500/60 text-sm">
                    {activeTournamentData?.startedAt
                      ? `Iniciado em ${formatDate(activeTournamentData.startedAt)}`
                      : "Nenhum torneio criado ainda"}
                  </p>
                </div>
                {/* Renomear */}
                {!isRenaming ? (
                  <button
                    onClick={() => { setRenameValue(activeTournamentData?.name ?? ""); setIsRenaming(true); }}
                    className="px-4 py-2 bg-amber-800/40 hover:bg-amber-700/40 border border-amber-700/50 rounded-lg text-amber-300 text-sm transition-colors"
                  >
                    ✏️ Renomear
                  </button>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="bg-[#1a0f00] border border-amber-700/50 rounded-lg px-3 py-1.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500"
                      placeholder="Novo nome..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && renameValue.trim()) {
                          renameTournamentMutation.mutate({ name: renameValue.trim() });
                          setIsRenaming(false);
                        }
                        if (e.key === "Escape") setIsRenaming(false);
                      }}
                    />
                    <button
                      onClick={() => { if (renameValue.trim()) { renameTournamentMutation.mutate({ name: renameValue.trim() }); setIsRenaming(false); } }}
                      disabled={!renameValue.trim() || renameTournamentMutation.isPending}
                      className="px-3 py-1.5 bg-green-800/60 hover:bg-green-700/60 border border-green-700/50 rounded-lg text-green-300 text-sm disabled:opacity-40"
                    >
                      Salvar
                    </button>
                    <button onClick={() => setIsRenaming(false)} className="px-3 py-1.5 text-amber-500 text-sm hover:text-amber-300">✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Criar novo torneio ── */}
            <div className="bg-[#2c1a00] border border-amber-900/40 rounded-xl p-6">
              <h3 className="font-medieval text-amber-400 mb-4">🎮 Criar Novo Torneio</h3>
              <p className="text-amber-500/60 text-xs mb-4">Criar um novo torneio encerra o atual e limpa a lista de participantes. O progresso dos jogadores é preservado até você clicar em Reiniciar.</p>
              <div className="flex gap-3">
                <input
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder="Nome do novo torneio (ex: Turma A - Maio 2026)"
                  className="flex-1 bg-[#1a0f00] border border-amber-700/50 rounded-lg px-4 py-2 text-amber-100 placeholder-amber-700 text-sm focus:outline-none focus:border-amber-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTournamentName.trim()) {
                      createTournamentMutation.mutate({ name: newTournamentName.trim() });
                      setNewTournamentName("");
                    }
                  }}
                />
                <button
                  onClick={() => { if (newTournamentName.trim()) { createTournamentMutation.mutate({ name: newTournamentName.trim() }); setNewTournamentName(""); } }}
                  disabled={!newTournamentName.trim() || createTournamentMutation.isPending}
                  className="px-5 py-2 bg-green-800/60 hover:bg-green-700/60 border border-green-700/50 rounded-lg text-green-300 text-sm font-semibold disabled:opacity-40 transition-colors"
                >
                  {createTournamentMutation.isPending ? "Criando..." : "+ Criar"}
                </button>
              </div>
            </div>

            {/* ── Participantes ── */}
            <div className="bg-[#2c1a00] border border-amber-900/40 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-medieval text-amber-400">👥 Participantes do Torneio</h3>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500/60 text-xs">
                    {participants?.filter(p => p.isParticipant).length ?? 0} de {participants?.length ?? 0} ativados
                  </span>
                  <button
                    onClick={() => setAllParticipantsMutation.mutate({ add: true })}
                    disabled={setAllParticipantsMutation.isPending || !activeTournamentData?.tournamentId}
                    className="px-3 py-1 bg-green-900/40 hover:bg-green-800/40 border border-green-700/50 rounded-lg text-green-300 text-xs font-semibold disabled:opacity-40 transition-colors"
                  >
                    ✔ Ativar todos
                  </button>
                  <button
                    onClick={() => setAllParticipantsMutation.mutate({ add: false })}
                    disabled={setAllParticipantsMutation.isPending || !activeTournamentData?.tournamentId}
                    className="px-3 py-1 bg-red-900/40 hover:bg-red-800/40 border border-red-700/50 rounded-lg text-red-300 text-xs font-semibold disabled:opacity-40 transition-colors"
                  >
                    ✕ Desativar todos
                  </button>
                </div>
              </div>
              {!activeTournamentData?.tournamentId ? (
                <p className="text-amber-500/60 text-sm text-center py-4">Crie um torneio primeiro para gerenciar participantes.</p>
              ) : (
                <>
                  <div className="relative mb-4">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500">🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar jogador..."
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      className="w-full bg-[#1a0f00] border border-amber-800/50 rounded-lg pl-9 pr-4 py-2 text-amber-100 placeholder-amber-700 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {(participants ?? [])
                      .filter(p => !participantSearch || (p.name ?? "").toLowerCase().includes(participantSearch.toLowerCase()) || (p.email ?? "").toLowerCase().includes(participantSearch.toLowerCase()))
                      .map((p) => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                            p.isParticipant
                              ? "bg-green-900/20 border-green-700/40"
                              : "bg-amber-900/10 border-amber-900/30"
                          }`}
                        >
                          <Avatar name={p.name ?? "?"} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-100 text-sm font-semibold truncate">{p.name ?? "Sem nome"}</span>
                              {p.role === "admin" && <span className="text-xs bg-amber-800/50 text-amber-300 px-1.5 py-0.5 rounded">Professor</span>}
                            </div>
                            <span className="text-amber-500/60 text-xs truncate">{p.email ?? ""}</span>
                          </div>
                          <button
                            onClick={() => toggleParticipantMutation.mutate({ userId: p.id, add: !p.isParticipant })}
                            disabled={toggleParticipantMutation.isPending}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              p.isParticipant
                                ? "bg-red-900/40 hover:bg-red-800/40 border-red-700/50 text-red-300"
                                : "bg-green-900/40 hover:bg-green-800/40 border-green-700/50 text-green-300"
                            }`}
                          >
                            {p.isParticipant ? "Remover" : "Adicionar"}
                          </button>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "students" && (<>
        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total de Alunos", value: totalStudents, icon: "👥", color: "text-blue-400" },
            { label: "Ativos Hoje", value: activeToday, icon: "⚡", color: "text-green-400" },
            { label: "Moedas Distribuídas", value: totalCoins.toLocaleString("pt-BR"), icon: "🪙", color: "text-amber-400" },
            { label: "Completaram 10 Territórios", value: completedAll, icon: "🏆", color: "text-yellow-400" },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-[#2c1a00] border border-amber-900/40 rounded-xl p-4 flex flex-col gap-1"
            >
              <span className="text-2xl">{card.icon}</span>
              <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
              <span className="text-amber-400/60 text-xs">{card.label}</span>
            </div>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500">🔍</span>
            <input
              type="text"
              placeholder="Buscar aluno por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#2c1a00] border border-amber-800/50 rounded-lg pl-9 pr-4 py-2 text-amber-100 placeholder-amber-700 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <span className="text-amber-500/60 text-sm">
            {filtered.length} aluno{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Table ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-amber-400 animate-pulse font-medieval text-lg">Carregando alunos...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-red-400 text-sm">Erro ao carregar dados: {error.message}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-5xl">🗺️</span>
            <p className="text-amber-500/60 text-sm">
              {search ? "Nenhum aluno encontrado para esta busca." : "Nenhum aluno cadastrado ainda."}
            </p>
          </div>
        ) : (
          <div className="bg-[#2c1a00] border border-amber-900/40 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-900/50 bg-[#1a0f00]/60">
                    {[
                      { key: "position" as SortKey, label: "#" },
                      { key: "name" as SortKey, label: "Aluno" },
                      { key: "coins" as SortKey, label: "🪙 Moedas" },
                      { key: "completedCount" as SortKey, label: "🏆 Territórios" },
                      { key: null, label: "📊 Desafios" },
                      { key: null, label: "📍 Território Atual" },
                      { key: "lastSignedIn" as SortKey, label: "⏰ Último Acesso" },
                    ].map((col) => (
                      <th
                        key={col.label}
                        onClick={() => col.key && handleSort(col.key)}
                        className={`px-4 py-3 text-left text-amber-400/80 font-semibold tracking-wide ${
                          col.key ? "cursor-pointer hover:text-amber-300 select-none" : ""
                        }`}
                      >
                        {col.label}
                        {col.key && <SortIcon k={col.key} />}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-amber-400/80 font-semibold">Detalhes</th>
                    <th className="px-4 py-3 text-left text-amber-400/80 font-semibold">⚙️ Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student, i) => {
                    const isExpanded = expandedRow === i;
                    const totalChallenges = getTotalChallengesCompleted(student);
                    const maxChallenges = student.completedCount * totalChallengesPerLevel +
                      Object.values(student.challengeProgress).reduce((acc, v) => acc + v, 0) -
                      student.completedCount * totalChallengesPerLevel;

                    return (
                      <Fragment key={student.userId ?? i}>
                        <tr
                          className={`border-b border-amber-900/20 transition-colors ${
                            isExpanded
                              ? "bg-amber-900/20"
                              : "hover:bg-amber-900/10"
                          }`}
                        >
                          {/* Position */}
                          <td className="px-4 py-3 text-amber-500/60 font-mono">
                            {student.position <= 3 ? (
                              <span>{["🥇", "🥈", "🥉"][student.position - 1]}</span>
                            ) : (
                              <span>{student.position}</span>
                            )}
                          </td>

                          {/* Name + avatar */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={student.name} />
                              <div>
                                <div className="font-semibold text-amber-100">{student.name}</div>
                                {student.email && (
                                  <div className="text-amber-500/50 text-xs">{student.email}</div>
                                )}
                                {student.role === "admin" && (
                                  <span className="text-xs bg-amber-700/40 text-amber-300 px-1.5 py-0.5 rounded">
                                    Professor
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Coins */}
                          <td className="px-4 py-3">
                            <span className="text-amber-400 font-bold">
                              {student.coins.toLocaleString("pt-BR")}
                            </span>
                          </td>

                          {/* Completed territories */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {Array.from({ length: 10 }).map((_, j) => (
                                  <div
                                    key={j}
                                    className={`w-2 h-4 rounded-sm ${
                                      j < student.completedCount
                                        ? "bg-amber-400"
                                        : j < student.unlockedCount
                                        ? "bg-amber-800"
                                        : "bg-amber-900/40"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-amber-300 text-xs">
                                {student.completedCount}/10
                              </span>
                            </div>
                          </td>

                          {/* Challenge progress bar */}
                          <td className="px-4 py-3 min-w-[140px]">
                            <ChallengeBar
                              progress={totalChallenges}
                              total={100}
                            />
                          </td>

                          {/* Current level */}
                          <td className="px-4 py-3 text-amber-300 text-xs">
                            {LEVEL_NAMES[student.currentLevel] ?? student.currentLevel}
                          </td>

                          {/* Last access */}
                          <td className="px-4 py-3">
                            <div className="text-amber-300 text-xs">
                              {timeAgo(student.lastSignedIn)}
                            </div>
                            <div className="text-amber-600/50 text-xs">
                              {formatDate(student.lastSignedIn)}
                            </div>
                          </td>

                          {/* Expand button */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : i)}
                              className="text-amber-500 hover:text-amber-300 transition-colors text-xs border border-amber-800/50 rounded px-2 py-1"
                            >
                              {isExpanded ? "▲ Fechar" : "▼ Ver mais"}
                            </button>
                          </td>

                          {/* Ações: bloquear/deletar */}
                          <td className="px-4 py-3">
                            {student.role !== "admin" && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setUserBlockedMutation.mutate({ userId: student.userId!, blocked: !student.blocked })}
                                  disabled={setUserBlockedMutation.isPending}
                                  className="px-2 py-1 text-xs rounded border transition-colors disabled:opacity-40 bg-yellow-900/30 hover:bg-yellow-800/40 border-yellow-800/50 text-yellow-300"
                                  title={student.blocked ? "Desbloquear usuário" : "Bloquear usuário"}
                                >
                                  {student.blocked ? "🔓" : "🔒"}
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Deletar permanentemente o usuário "${student.name}"? Esta ação não pode ser desfeita.`)) {
                                      deleteUserMutation.mutate({ userId: student.userId! });
                                    }
                                  }}
                                  disabled={deleteUserMutation.isPending}
                                  className="px-2 py-1 text-xs rounded border transition-colors disabled:opacity-40 bg-red-900/30 hover:bg-red-800/40 border-red-800/50 text-red-300"
                                  title="Deletar usuário"
                                >
                                  🗑
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr key={`detail-${i}`} className="bg-[#1a0f00]/60">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="space-y-3">
                                <h4 className="text-amber-400 font-semibold text-sm mb-2">
                                  Progresso por Território
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                  {LEVELS.map((level) => {
                                    const done = student.completedLevels.includes(level.id);
                                    const unlocked = student.unlockedCount > 0 &&
                                      (student.completedLevels.includes(level.id) ||
                                        student.currentLevel === level.id ||
                                        Object.keys(student.challengeProgress).includes(level.id));
                                    const challengesDone = student.challengeProgress[level.id] ?? 0;
                                    return (
                                      <div
                                        key={level.id}
                                        className={`rounded-lg p-3 border text-xs ${
                                          done
                                            ? "bg-amber-900/30 border-amber-600/50"
                                            : unlocked
                                            ? "bg-amber-900/10 border-amber-800/30"
                                            : "bg-black/20 border-amber-900/20 opacity-50"
                                        }`}
                                      >
                                        <div className="flex items-center gap-1 mb-1">
                                          <span>{level.emoji}</span>
                                          <span className={`font-semibold truncate ${done ? "text-amber-300" : "text-amber-500"}`}>
                                            {level.name.split(" ").slice(-1)[0]}
                                          </span>
                                          {done && <span className="ml-auto text-green-400">✓</span>}
                                        </div>
                                        <ChallengeBar
                                          progress={done ? 10 : challengesDone}
                                          total={10}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex gap-6 mt-2 text-xs text-amber-500/60">
                                  <span>Entrou em: {formatDate(student.joinedAt)}</span>
                                  <span>Último progresso: {formatDate(student.progressUpdatedAt)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>) }

        {activeTab === "history" && (
          <div className="bg-[#2c1a00] border border-amber-900/40 rounded-xl overflow-hidden">
            <div className="p-6">
              {!tournaments || tournaments.length === 0 ? (
                <p className="text-amber-500/60 text-sm text-center py-6">
                  Nenhum torneio registrado ainda. O histórico é criado automaticamente ao reiniciar o jogo.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Lista de torneios */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tournaments.map((t) => (
                      <div
                        key={t.tournamentId}
                        className={`relative rounded-lg border transition-all ${
                          selectedTournament === t.tournamentId
                            ? "bg-amber-900/30 border-amber-600/60"
                            : "bg-black/20 border-amber-900/30"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedTournament(
                            selectedTournament === t.tournamentId ? null : t.tournamentId
                          )}
                          className="text-left w-full p-4 hover:bg-amber-900/10 rounded-lg transition-all"
                        >
                          <div className="font-semibold text-amber-300 text-sm truncate pr-8">{t.tournamentName}</div>
                          <div className="text-amber-500/60 text-xs mt-1">{formatDate(t.resetAt)}</div>
                          <div className="text-amber-400/70 text-xs mt-2">
                            {t.playerCount} jogador{t.playerCount !== 1 ? "es" : ""}
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Deletar o histórico de "${t.tournamentName}"? Esta ação não pode ser desfeita.`)) {
                              deleteTournamentMutation.mutate({ tournamentId: t.tournamentId });
                              if (selectedTournament === t.tournamentId) setSelectedTournament(null);
                            }
                          }}
                          disabled={deleteTournamentMutation.isPending}
                          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-md bg-red-900/30 hover:bg-red-800/50 border border-red-800/40 text-red-400 hover:text-red-200 text-xs transition-colors disabled:opacity-40"
                          title="Deletar torneio"
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Ranking do torneio selecionado */}
                  {selectedTournament && (() => {
                    const t = tournaments.find((x) => x.tournamentId === selectedTournament);
                    if (!t) return null;
                    return (
                      <div className="mt-4 rounded-xl border border-amber-800/40 overflow-hidden">
                        <div className="bg-amber-900/20 px-4 py-3 flex items-center justify-between gap-3">
                          <h3 className="font-medieval text-amber-300 truncate">{t.tournamentName}</h3>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-amber-500/60 text-xs hidden sm:block">{formatDate(t.resetAt)}</span>
                            <button
                              onClick={() => exportTournamentCsv(t)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-green-700/50 bg-green-900/30 hover:bg-green-800/40 text-green-300 hover:text-green-100 transition-colors"
                              title="Exportar ranking como CSV"
                            >
                              📅 Exportar CSV
                            </button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-amber-900/30 text-amber-500/60 text-xs">
                                {["#", "Jogador", "Moedas", "Territórios", "Nível Final"].map((col) => (
                                  <th key={col} className="px-4 py-2 text-left font-medium">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {t.players.map((p) => (
                                <tr key={`${t.tournamentId}-${p.position}`} className="border-b border-amber-900/20 hover:bg-amber-900/10">
                                  <td className="px-4 py-2 text-amber-500/60 font-mono">
                                    {p.position <= 3
                                      ? ["🥇", "🥈", "🥉"][p.position - 1]
                                      : p.position}
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                      <Avatar name={p.name} />
                                      <div>
                                        <div className="font-semibold text-amber-200">{p.name}</div>
                                        {p.email && <div className="text-amber-500/50 text-xs">{p.email}</div>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-amber-400 font-bold">{p.coins.toLocaleString("pt-BR")}</td>
                                  <td className="px-4 py-2 text-amber-300">{p.completedLevels.length}</td>
                                  <td className="px-4 py-2 text-amber-300/70 text-xs">
                                    {LEVEL_NAMES[p.currentLevel] ?? p.currentLevel}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="bg-[#2c1a00] border border-amber-900/40 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-900/30 flex items-center justify-between">
              <h3 className="font-medieval text-amber-300">Eventos de Segurança</h3>
              <button
                onClick={() => refetchSecurityEvents()}
                className="px-3 py-1 text-xs rounded-lg border border-amber-700/50 text-amber-300 hover:bg-amber-900/20"
              >
                Atualizar
              </button>
            </div>
            {loadingSecurityEvents ? (
              <div className="p-6 text-amber-400/70 text-sm">Carregando eventos...</div>
            ) : !securityEvents || securityEvents.length === 0 ? (
              <div className="p-6 text-amber-500/70 text-sm">Nenhum evento de segurança registrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-amber-900/30 text-amber-500/70">
                      <th className="px-4 py-2 text-left">Data/Hora</th>
                      <th className="px-4 py-2 text-left">Tipo</th>
                      <th className="px-4 py-2 text-left">Usuário</th>
                      <th className="px-4 py-2 text-left">E-mail</th>
                      <th className="px-4 py-2 text-left">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityEvents.map((event) => (
                      <tr key={event.id} className="border-b border-amber-900/20 align-top">
                        <td className="px-4 py-2 text-amber-400/80 whitespace-nowrap">{formatDate(event.createdAt)}</td>
                        <td className="px-4 py-2 text-amber-200">{event.type}</td>
                        <td className="px-4 py-2 text-amber-300">{event.userName ?? "—"}</td>
                        <td className="px-4 py-2 text-amber-500/80">{event.userEmail ?? "—"}</td>
                        <td className="px-4 py-2 text-xs text-amber-300/80 max-w-[520px]">
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(event.details ?? {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
