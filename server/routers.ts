import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getUserProgress, upsertUserProgress, getTopPlayers, getAllStudents, resetAllProgress, getTournamentHistory, getActiveTournament, setActiveTournament } from "./db";

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
          coins: z.number().min(0),
          unlockedLevels: z.array(z.string()),
          completedLevels: z.array(z.string()),
          currentLevel: z.string(),
          challengeProgress: z.record(z.string(), z.number()),
        })
      )
      .mutation(async ({ ctx, input }) => {
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
    /** Lista todos os alunos com progresso — exclusivo para admin */
    getStudents: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao professor." });
      }
      const rows = await getAllStudents();
      return rows.map((r, idx) => ({
        position: idx + 1,
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

    /** Retorna o torneio ativo atual — público */
    getActiveTournament: publicProcedure.query(async () => {
      const t = await getActiveTournament();
      return { name: t.name, startedAt: t.startedAt };
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
