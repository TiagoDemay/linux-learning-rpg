import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { decodeJwt } from "jose";
import { getUserProgress, upsertUserProgress, getTopPlayers, getAllStudents, getStudentsByTournament, resetAllProgress, getTournamentHistory, getActiveTournament, setActiveTournament, createTournament, renameTournament, getAllUsersWithParticipation, addParticipant, removeParticipant, setAllParticipants, deleteTournamentFromHistory, deleteUser, setUserBlocked, getTournamentEventTimestamp, getAllUsersForAdmin, logSecurityEvent, getSecurityEvents } from "./db";
import { validateChallengeAnswer } from "./challenge-answers";
import { revokeSessionToken } from "./_core/sessionRevocation";

// ── Security constants ────────────────────────────────────────────────────────
// Moedas máximas ganháveis legitimamente:
// 1752 (100 desafios) + 800 (10 bônus de território × 80) + margem para Amuleto da Fortuna
const MAX_COINS = 3000;
const MAX_CHALLENGE_PROGRESS_PER_LEVEL = 10;
const VALID_SHOP_ITEM_IDS = new Set([
  "autocomplete", "reveal-hint", "man-extended", "history-50",
  "cheat-sheet-network", "cheat-sheet-git", "cheat-sheet-permissions",
  "double-coins", "skip-challenge",
]);
const SHOP_ITEM_MAX_STACK: Record<string, number> = {
  "autocomplete": 1, "man-extended": 1, "history-50": 1,
  "cheat-sheet-network": 1, "cheat-sheet-git": 1, "cheat-sheet-permissions": 1,
  "reveal-hint": 10, "double-coins": 5, "skip-challenge": 3,
};
const SHOP_ITEM_PRICES: Record<string, number> = {
  "autocomplete": 30, "reveal-hint": 15, "man-extended": 25, "history-50": 20,
  "cheat-sheet-network": 20, "cheat-sheet-git": 20, "cheat-sheet-permissions": 20,
  "double-coins": 40, "skip-challenge": 50,
};
const VALID_LEVEL_IDS = new Set([
  "floresta-stallman", "tundra-slackware", "montanhas-kernighan", "pantano-systemd",
  "reino-torvalds", "cidade-gnu", "planicies-redhat", "deserto-debian",
  "ilhas-canonical", "vale-arch",
]);
const CHALLENGE_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
// O terminal chama challenge.submit a cada comando digitado (para verificar se o desafio foi completado).
// Um aluno pode digitar muitos comandos explorando o terminal antes de completar o desafio.
// 100 tentativas por 10 minutos é suficiente para uso normal sem abrir espaço para brute-force.
const CHALLENGE_MAX_ATTEMPTS_PER_WINDOW = 100;
const challengeAttemptTracker = new Map<string, number[]>();

function enforceChallengeAttemptLimit(userId: number, levelId: string, challengeIndex: number) {
  const now = Date.now();
  const key = `${userId}:${levelId}:${challengeIndex}`;
  const prev = challengeAttemptTracker.get(key) ?? [];
  const recent = prev.filter(ts => now - ts <= CHALLENGE_ATTEMPT_WINDOW_MS);
  if (recent.length >= CHALLENGE_MAX_ATTEMPTS_PER_WINDOW) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Muitas tentativas para este desafio. Aguarde alguns minutos.",
    });
  }
  recent.push(now);
  challengeAttemptTracker.set(key, recent);
}

/**
 * Valida o progresso recebido do cliente contra os limites do jogo.
 * Lança TRPCError se detectar manipulação.
 */
async function validateProgress(input: {
  coins: number;
  unlockedLevels: string[];
  completedLevels: string[];
  currentLevel: string;
  challengeProgress: Record<string, number>;
  purchasedItems?: string[];
  consumableStock?: Record<string, number>;
}, existing: { coins: number; challengeProgress: Record<string, number> } | null, userId?: number) {
  // Helper: loga e lança erro
  const reject = async (type: string, details: Record<string, unknown>, message: string) => {
    if (userId) await logSecurityEvent(userId, type, { ...details, input_summary: { coins: input.coins, currentLevel: input.currentLevel } });
    throw new TRPCError({ code: "BAD_REQUEST", message });
  };

  // 1. Limite absoluto de moedas
  if (input.coins > MAX_COINS) {
    await reject("coins_overflow", { coins: input.coins, max: MAX_COINS }, `Valor de moedas inválido: ${input.coins}. Máximo permitido: ${MAX_COINS}.`);
  }

  // 2. Moedas não podem diminuir abruptamente (anti-rollback de progresso)
  if (existing && input.coins < existing.coins - 800) {
    await reject("coins_rollback", { coins: input.coins, existing_coins: existing.coins }, "Redução de moedas suspeita detectada.");
  }

  // 3. IDs de territórios devem ser válidos
  for (const levelId of input.unlockedLevels) {
    if (!VALID_LEVEL_IDS.has(levelId)) {
      await reject("invalid_level_unlocked", { levelId }, `Território inválido: ${levelId}`);
    }
  }
  for (const levelId of input.completedLevels) {
    if (!VALID_LEVEL_IDS.has(levelId)) {
      await reject("invalid_level_completed", { levelId }, `Território concluído inválido: ${levelId}`);
    }
  }
  if (!VALID_LEVEL_IDS.has(input.currentLevel)) {
    await reject("invalid_level_current", { currentLevel: input.currentLevel }, `Território atual inválido: ${input.currentLevel}`);
  }

  // 4. Progresso de desafios não pode exceder o máximo por território
  for (const [levelId, progress] of Object.entries(input.challengeProgress)) {
    if (!VALID_LEVEL_IDS.has(levelId)) {
      await reject("invalid_level_progress", { levelId }, `Território de progresso inválido: ${levelId}`);
    }
    if (typeof progress !== "number" || progress < 0 || progress > MAX_CHALLENGE_PROGRESS_PER_LEVEL) {
      await reject("invalid_progress_value", { levelId, progress, max: MAX_CHALLENGE_PROGRESS_PER_LEVEL }, `Progresso inválido para ${levelId}: ${progress}. Máximo: ${MAX_CHALLENGE_PROGRESS_PER_LEVEL}.`);
    }
    // 5. Progresso não pode regredir (anti-replay de desafios para ganhar moedas novamente)
    if (existing?.challengeProgress?.[levelId] !== undefined) {
      const existingProgress = existing.challengeProgress[levelId] as number;
      if (progress < existingProgress) {
        await reject("progress_regression", { levelId, progress, existingProgress }, `Regressão de progresso detectada em ${levelId}: ${progress} < ${existingProgress}.`);
      }
    }
  }

  // 6. Territórios completados devem estar desbloqueados
  for (const levelId of input.completedLevels) {
    if (!input.unlockedLevels.includes(levelId)) {
      await reject("completed_not_unlocked", { levelId }, `Território ${levelId} marcado como completo mas não desbloqueado.`);
    }
  }

  // 7. Itens comprados devem ser IDs válidos
  if (input.purchasedItems) {
    for (const itemId of input.purchasedItems) {
      if (!VALID_SHOP_ITEM_IDS.has(itemId)) {
        await reject("invalid_item_purchased", { itemId }, `Item de loja inválido: ${itemId}`);
      }
    }
    const permanentItems = ["autocomplete", "man-extended", "history-50", "cheat-sheet-network", "cheat-sheet-git", "cheat-sheet-permissions"];
    const permanentCost = input.purchasedItems
      .filter(id => permanentItems.includes(id))
      .reduce((sum, id) => sum + (SHOP_ITEM_PRICES[id] ?? 0), 0);
    if (permanentCost > MAX_COINS) {
      await reject("items_cost_overflow", { permanentCost, max: MAX_COINS }, "Custo de itens permanentes excede o limite máximo.");
    }
  }

  // 8. Estoque de consumíveis deve respeitar os limites máximos
  if (input.consumableStock) {
    for (const [itemId, qty] of Object.entries(input.consumableStock)) {
      if (!VALID_SHOP_ITEM_IDS.has(itemId)) {
        await reject("invalid_consumable_id", { itemId }, `Item consumível inválido: ${itemId}`);
      }
      const maxStack = SHOP_ITEM_MAX_STACK[itemId] ?? 1;
      if (typeof qty !== "number" || qty < 0 || qty > maxStack) {
        await reject("consumable_stack_overflow", { itemId, qty, maxStack }, `Quantidade inválida para ${itemId}: ${qty}. Máximo: ${maxStack}.`);
      }
    }
  }
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const parsedCookies = parseCookieHeader(ctx.req.headers.cookie ?? "");
      const sessionToken = parsedCookies[COOKIE_NAME];
      if (sessionToken) {
        try {
          const decoded = decodeJwt(sessionToken);
          const exp = typeof decoded.exp === "number" ? decoded.exp : undefined;
          const expiresAtMs = exp ? exp * 1000 : Date.now() + 60 * 60 * 1000;
          revokeSessionToken(sessionToken, expiresAtMs);
        } catch {
          revokeSessionToken(sessionToken, Date.now() + 60 * 60 * 1000);
        }
      }
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
          purchasedItems: z.array(z.string()).optional(),
          consumableStock: z.record(z.string(), z.number().min(0).max(999)).optional(),
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
        await validateProgress(input, existingForValidation, ctx.user.id);

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
    getStudents: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(100), offset: z.number().min(0).default(0) }).optional())
      .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao professor." });
      }
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;
      const rows = await getStudentsByTournament(limit, offset);
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
        await logSecurityEvent(ctx.user.id, "ADMIN_RESET_GAME", { tournamentName: input.tournamentName, adminId: ctx.user.id, adminName: ctx.user.name });
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
        await logSecurityEvent(ctx.user.id, "ADMIN_DELETE_USER", { targetUserId: input.userId, adminId: ctx.user.id, adminName: ctx.user.name });
        await deleteUser(input.userId);
        return { success: true };
      }),
    /** Bloqueia ou desbloqueia um usuário — exclusivo para admin */
    setUserBlocked: protectedProcedure
      .input(z.object({ userId: z.number(), blocked: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível bloquear o próprio usuário." });
        await logSecurityEvent(ctx.user.id, input.blocked ? "ADMIN_BLOCK_USER" : "ADMIN_UNBLOCK_USER", { targetUserId: input.userId, adminId: ctx.user.id, adminName: ctx.user.name });
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

    /** Retorna os eventos de segurança mais recentes — exclusivo para admin */
    getSecurityEvents: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
        userId: z.number().optional(),
        type: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao professor." });
        return getSecurityEvents(input?.limit ?? 50, input?.userId, input?.type, input?.offset ?? 0);
      }),
  }),

  challenge: router({
    /**
     * Valida server-side se o aluno completou um desafio.
     * Recebe o histórico de comandos e verifica contra os padrões esperados.
     * Retorna a recompensa apenas se válido — nunca expõe a resposta.
     */
    submit: protectedProcedure
      .input(
        z.object({
          levelId: z.string(),
          challengeIndex: z.number().min(0).max(9),
          commandHistory: z.array(z.string().max(500)).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        enforceChallengeAttemptLimit(ctx.user.id, input.levelId, input.challengeIndex);
        // Valida se o levelId é legítimo
        if (!VALID_LEVEL_IDS.has(input.levelId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Território inválido." });
        }
        // Verifica o progresso atual para evitar replay (ganhar moedas duas vezes)
        const existing = await getUserProgress(ctx.user.id);
        const currentProgress = (existing?.challengeProgress as Record<string, number> ?? {});
        const alreadyCompleted = (currentProgress[input.levelId] ?? 0) > input.challengeIndex;
        if (alreadyCompleted) {
          return { valid: false, reward: 0, message: "Desafio já concluído anteriormente." };
        }
        // Valida os comandos contra os padrões server-side
        const result = validateChallengeAnswer(input.levelId, input.challengeIndex, input.commandHistory);
        return result;
      }),
  }),

  shop: router({
    /**
     * Processa a compra de um item da loja server-side.
     * Debita as moedas e registra o item no progresso do usuário.
     */
    buy: protectedProcedure
      .input(
        z.object({
          itemId: z.string(),
          currentCoins: z.number().min(0).max(MAX_COINS),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!VALID_SHOP_ITEM_IDS.has(input.itemId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Item inválido." });
        }
        const price = SHOP_ITEM_PRICES[input.itemId];
        if (price === undefined) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Preço do item não encontrado." });
        }
        // Busca o progresso atual do servidor (fonte da verdade)
        const existing = await getUserProgress(ctx.user.id);
        const serverCoins = existing?.coins ?? 0;
        if (serverCoins < price) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Moedas insuficientes. Você tem ${serverCoins} moedas, o item custa ${price}.`,
          });
        }
        const isPermanent = ["autocomplete", "man-extended", "history-50",
          "cheat-sheet-network", "cheat-sheet-git", "cheat-sheet-permissions"].includes(input.itemId);
        // Lê purchasedItems e consumableStock do banco — fonte da verdade no servidor
        const purchasedItems: string[] = (existing?.purchasedItems as string[]) ?? [];
        const consumableStock: Record<string, number> = (existing?.consumableStock as Record<string, number>) ?? {};
        if (isPermanent && purchasedItems.includes(input.itemId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Item permanente já adquirido." });
        }
        if (!isPermanent) {
          const maxStack = SHOP_ITEM_MAX_STACK[input.itemId] ?? 1;
          const currentQty = consumableStock[input.itemId] ?? 0;
          if (currentQty >= maxStack) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `Estoque máximo atingido (${maxStack}).` });
          }
        }
        // Debita as moedas e registra o item no banco
        const newCoins = serverCoins - price;
        const newPurchasedItems = isPermanent ? [...purchasedItems, input.itemId] : purchasedItems;
        const newConsumableStock = isPermanent ? consumableStock : {
          ...consumableStock,
          [input.itemId]: (consumableStock[input.itemId] ?? 0) + 1,
        };
        await upsertUserProgress({
          userId: ctx.user.id,
          coins: newCoins,
          unlockedLevels: (existing?.unlockedLevels as string[] ?? ["floresta-stallman"]),
          completedLevels: (existing?.completedLevels as string[] ?? []),
          currentLevel: existing?.currentLevel ?? "floresta-stallman",
          challengeProgress: (existing?.challengeProgress as Record<string, number> ?? {}),
          purchasedItems: newPurchasedItems,
          consumableStock: newConsumableStock,
        });
        return { success: true, newCoins, newPurchasedItems, newConsumableStock, itemId: input.itemId };
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
