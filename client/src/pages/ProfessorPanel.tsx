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
    <div className="min-h-screen bg-[#1a0f00] text-amber-100 flex flex-col">
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

      <div className="flex-1 p-6 space-y-6 max-w-[1400px] mx-auto w-full">
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
                      <Fragment key={student.name ?? i}>
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
      </div>
    </div>
  );
}
