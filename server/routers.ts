import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getUserProgress, upsertUserProgress, getTopPlayers, getAllStudents, getStudentsByTournament, resetAllProgress, getTournamentHistory, getActiveTournament, setActiveTournament, createTournament, renameTournament, getAllUsersWithParticipation, addParticipant, removeParticipant, setAllParticipants, deleteTournamentFromHistory, deleteUser, setUserBlocked, getTournamentEventTimestamp, getAllUsersForAdmin } from "./db";

// ── Security constants ────────────────────────────────────────────────────────
// Moedas máximas ganháveis legitimamente:
// 1752 (100 desafios) + 800 (10 bônus de território × 80) + margem para Amuleto da Fortuna
const MAX_COINS = 3000;
const MAX_CHALLENGE_PROGRESS_PER_LEVEL = 10;
const VALID_LEVEL_IDS = new Set([
  "floresta-stallman", "tundra-slackware", "montanhas-kernighan", "pantano-systemd",
  "reino-torvalds", "cidade-gnu", "planicies-redhat", "deserto-debian",
  "ilhas-canonical", "vale-arch",
]);

/**
 * Valida o progresso recebido do cliente contra os limites do jogo.
 * Lança TRPCError se detectar manipulação.
 */
function validateProgress(input: {
  coins: number;
  unlockedLevels: string[];
  completedLevels: string[];
  currentLevel: string;
  challengeProgress: Record<string, number>;
}, existing: { coins: number; challengeProgress: Record<string, number> } | null) {
  // 1. Limite absoluto de moedas
  if (input.coins > MAX_COINS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Valor de moedas inválido: ${input.coins}. Máximo permitido: ${MAX_COINS}.`,
    });
  }

  // 2. Moedas não podem diminuir abruptamente (anti-rollback de progresso)
  // Permitimos uma margem de 800 para compras na loja
  if (existing && input.coins < existing.coins - 800) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Redução de moedas suspeita detectada.",
    });
  }

  // 3. IDs de territórios devem ser válidos
  for (const levelId of input.unlockedLevels) {
    if (!VALID_LEVEL_IDS.has(levelId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Território inválido: ${levelId}` });
    }
  }
  for (const levelId of input.completedLevels) {
    if (!VALID_LEVEL_IDS.has(levelId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Território concluído inválido: ${levelId}` });
    }
  }
  if (!VALID_LEVEL_IDS.has(input.currentLevel)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Território atual inválido: ${input.currentLevel}` });
  }

  // 4. Progresso de desafios não pode exceder o máximo por território
  for (const [levelId, progress] of Object.entries(input.challengeProgress)) {
    if (!VALID_LEVEL_IDS.has(levelId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Território de progresso inválido: ${levelId}` });
    }
    if (typeof progress !== "number" || progress < 0 || progress > MAX_CHALLENGE_PROGRESS_PER_LEVEL) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Progresso inválido para ${levelId}: ${progress}. Máximo: ${MAX_CHALLENGE_PROGRESS_PER_LEVEL}.`,
      });
    }
    // 5. Progresso não pode regredir (anti-replay de desafios para ganhar moedas novamente)
    if (existing?.challengeProgress?.[levelId] !== undefined) {
      const existingProgress = existing.challengeProgress[levelId] as number;
      if (progress < existingProgress) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Regressão de progresso detectada em ${levelId}: ${progress} < ${existingProgress}.`,
        });
      }
    }
  }

  // 6. Territórios completados devem estar desbloqueados
  for (const levelId of input.completedLevels) {
    if (!input.unlockedLevels.includes(levelId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Território ${levelId} marcado como completo mas não desbloqueado.`,
      });
    }
  }
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  progress: router({
    /** Carrega o progresso salvo do usuário logado */
    get: protectedProcedure.query(async ({ ctx }) => {
      const progress = await getUserProgress(ctx.user.id);
      if (!progress) {
        return {
          coins: 0,
          unlockedLevels: ["floresta-stallman"] as string[],
          completedLevels: [] as string[],
          currentLevel: "floresta-stallman",
          challengeProgress: {} as Record<string, number>,
        };
      }
      return {
        coins: progress.coins,
        unlockedLevels: (progress.unlockedLevels ?? ["floresta-stallman"]) as string[],
        completedLevels: (progress.completedLevels ?? []) as string[],
        currentLevel: progress.currentLevel,
        challengeProgress: (progress.challengeProgress ?? {}) as Record<string, number>,
      };
    }),

    /** Salva o progresso completo do usuário logado */
    save: protectedProcedure
      .input(
        z.object({
          coins: z.number().min(0).max(MAX_COINS),
          unlockedLevels: z.array(z.string()).max(VALID_LEVEL_IDS.size),
          completedLevels: z.array(z.string()).max(VALID_LEVEL_IDS.size),
          currentLevel: z.string(),
          challengeProgress: z.record(z.string(), z.number().min(0).max(MAX_CHALLENGE_PROGRESS_PER_LEVEL)),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Busca o progresso atual do servidor para validação anti-cheat
        const existing = await getUserProgress(ctx.user.id);
        const existingForValidation = existing
          ? {
              coins: existing.coins,
              challengeProgress: (existing.challengeProgress ?? {}) as Record<string, number>,
            }
          : null;

        // Valida o progresso recebido contra os limites do jogo
        validateProgress(input, existingForValidation);

        await upsertUserProgress({
          userId: ctx.user.id,
          coins: input.coins,
          unlockedLevels: input.unlockedLevels,
          completedLevels: input.completedLevels,
          currentLevel: input.currentLevel,
          challengeProgress: input.challengeProgress,
        });
        return { success: true };
      }),
  }),

  professor: router({
    /** Lista alunos do torneio ativo (ou todos se sem torneio) — exclusivo para admin */
    getStudents: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao professor." });
      }
      const rows = await getStudentsByTournament();
      return rows.map((r, idx) => ({
        position: idx + 1,
        userId: r.userId ?? null,
        name: r.name ?? "Aventureiro Anônimo",
        email: r.email ?? null,
        coins: r.coins ?? 0,
        unlockedCount: Array.isArray(r.unlockedLevels) ? (r.unlockedLevels as string[]).length : 1,
        completedCount: Array.isArray(r.completedLevels) ? (r.completedLevels as string[]).length : 0,
        completedLevels: (r.completedLevels ?? []) as string[],
        currentLevel: r.currentLevel ?? "floresta-stallman",
        challengeProgress: (r.challengeProgress ?? {}) as Record<string, number>,
        lastSignedIn: r.lastSignedIn,
        progressUpdatedAt: r.progressUpdatedAt ?? null,
        joinedAt: r.createdAt,
        role: r.role,
        blocked: (r as any).blocked ?? 0 as number,
      }));
    }),

    /**
     * Salva snapshot do torneio atual e zera o progresso de todos os jogadores.
     * Exclusivo para admin.
     */
    resetGame: protectedProcedure
      .input(z.object({ tournamentName: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao professor." });
        }
        const tournamentId = await resetAllProgress(input.tournamentName);
        // Atualiza o torneio ativo com o novo nome
        await setActiveTournament(input.tournamentName);
        return { success: true, tournamentId };
      }),

    /** Cria um novo torneio e o define como ativo — exclusivo para admin */
    createTournament: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao professor." });
        }
        const tournament = await createTournament(input.name);
        return { success: true, tournament };
      }),

    /** Renomeia o torneio ativo — exclusivo para admin */
    renameTournament: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao professor." });
        }
        await renameTournament(input.name);
        return { success: true };
      }),

    /** Lista todos os usuários com flag de participação no torneio ativo — exclusivo para admin */
    getParticipants: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao professor." });
      }
      return getAllUsersWithParticipation();
    }),

    /** Adiciona ou remove um participante do torneio ativo — exclusivo para admin */
    toggleParticipant: protectedProcedure
      .input(z.object({ userId: z.number(), add: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao professor." });
        }
        if (input.add) {
          await addParticipant(input.userId);
        } else {
          await removeParticipant(input.userId);
        }
        return { success: true };
      }),

    /** Retorna o torneio ativo atual — público */
    getActiveTournament: publicProcedure.query(async () => {
      const t = await getActiveTournament();
      return { name: t.name, startedAt: t.startedAt, tournamentId: (t as any).tournamentId ?? null };
    }),

    /** Retorna o histórico de torneios anteriores — exclusivo para admin */
    getTournamentHistory: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao professor." });
      }
      const history = await getTournamentHistory();
      return history.map((t) => ({
        tournamentId: t.tournamentId,
        tournamentName: t.tournamentName,
        resetAt: t.resetAt,
        playerCount: t.players.length,
        players: t.players.map((p) => ({
          position: p.position,
          name: p.userName ?? "Aventureiro Anônimo",
          email: p.userEmail ?? null,
          coins: p.coins,
          completedLevels: (p.completedLevels ?? []) as string[],
          currentLevel: p.currentLevel,
          challengeProgress: (p.challengeProgress ?? {}) as Record<string, number>,
        })),
      }));
    }),

    /** Deleta um torneio do histórico — exclusivo para admin */
    deleteTournamentHistory: protectedProcedure
      .input(z.object({ tournamentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteTournamentFromHistory(input.tournamentId);
        return { success: true };
      }),

    /** Ativa ou desativa TODOS os usuários como participantes do torneio ativo — exclusivo para admin */
    setAllParticipants: protectedProcedure
      .input(z.object({ add: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await setAllParticipants(input.add);
        return { success: true };
      }),

    /** Deleta um usuário e seu progresso — exclusivo para admin */
    deleteUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível deletar o próprio usuário." });
        await deleteUser(input.userId);
        return { success: true };
      }),

    /** Bloqueia ou desbloqueia um usuário — exclusivo para admin */
    setUserBlocked: protectedProcedure
      .input(z.object({ userId: z.number(), blocked: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível bloquear o próprio usuário." });
        await setUserBlocked(input.userId, input.blocked);
        return { success: true };
      }),

    /** Retorna todos os usuários para gestão de admin — exclusivo para admin */
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllUsersForAdmin();
    }),

    /** Retorna o timestamp do último evento de torneio (para banner de notificação) — público */
    getTournamentEvent: publicProcedure.query(async () => {
      return getTournamentEventTimestamp();
    }),
  }),

  ranking: router({
    /** Retorna o top 20 jogadores por moedas — público */
    getTop: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ input }) => {
        const rows = await getTopPlayers(input?.limit ?? 20);
        return rows.map((r, idx) => ({
          position: idx + 1,
          name: r.name ?? "Aventureiro Anônimo",
          coins: r.coins,
          completedCount: Array.isArray(r.completedLevels) ? (r.completedLevels as string[]).length : 0,
          currentLevel: r.currentLevel,
          updatedAt: r.updatedAt,
        }));
      }),
  }),
});

export type AppRouter = typeof appRouter;
